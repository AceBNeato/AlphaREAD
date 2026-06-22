-- AlphabetGO Security Migration
-- Run this in the Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Tables if they don't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  email TEXT NULL,
  avatar TEXT NULL,
  teacher_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  class_code TEXT NULL,
  student_code TEXT NULL,
  student_pin VARCHAR(6) NULL,
  activated_device_id TEXT NULL,
  pin_hash TEXT NULL,
  pin_last_changed TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id INT NOT NULL,
  score INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure the new columns exist if the table was already created in an older version
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_id UUID NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_pin VARCHAR(6) NULL;

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- 3. Clear existing RLS policies (so we can re-run this script safely)
DROP POLICY IF EXISTS "Public profiles select" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teacher read own and students" ON public.profiles;
DROP POLICY IF EXISTS "Auth link profile read" ON public.profiles;
DROP POLICY IF EXISTS "Auth link profile update" ON public.profiles;
DROP POLICY IF EXISTS "Admin full access progress" ON public.progress;
DROP POLICY IF EXISTS "Teacher read student progress" ON public.progress;

-- 4. RLS Helper Functions to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE auth_id = p_uid AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE auth_id = p_uid AND role = 'teacher'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_id_by_auth(p_uid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.profiles WHERE auth_id = p_uid LIMIT 1;
  RETURN v_id;
END;
$$;

-- 5. RLS Policies for Profiles
-- Allow admins to do anything
CREATE POLICY "Admin full access profiles" ON public.profiles
  FOR ALL
  USING ( public.is_admin(auth.uid()) );

-- Allow teachers to read their own profile and their students' profiles
CREATE POLICY "Teacher read own and students" ON public.profiles
  FOR SELECT
  USING (
    (auth.uid() = auth_id) OR 
    (role = 'student' AND teacher_id = public.get_profile_id_by_auth(auth.uid()))
  );

-- Allow a newly authenticated user to view their own profile by email
CREATE POLICY "Auth link profile read" ON public.profiles
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Allow a newly authenticated user to link their auth_id
CREATE POLICY "Auth link profile update" ON public.profiles
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email AND auth_id IS NULL)
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- 6. RLS Policies for Progress
-- Admins can read all progress
CREATE POLICY "Admin full access progress" ON public.progress
  FOR ALL
  USING ( public.is_admin(auth.uid()) );

-- Teachers can read their students' progress
CREATE POLICY "Teacher read student progress" ON public.progress
  FOR SELECT
  USING (
    public.is_teacher(auth.uid()) AND student_id IN (
      SELECT id FROM public.profiles WHERE teacher_id = public.get_profile_id_by_auth(auth.uid())
    )
  );

-- 7. RPC: Secure Student Login (Bypasses RLS to verify PIN and enforce device lock)
CREATE OR REPLACE FUNCTION public.verify_student_login(p_code TEXT, p_pin TEXT, p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student public.profiles%ROWTYPE;
BEGIN
  -- Find student
  SELECT * INTO v_student FROM public.profiles 
  WHERE student_code = p_code AND student_pin = p_pin AND role = 'student';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid student code or PIN.';
  END IF;

  -- Device binding logic
  IF v_student.activated_device_id IS NOT NULL AND v_student.activated_device_id != p_device_id THEN
    RAISE EXCEPTION 'This account is locked to another device.';
  END IF;

  -- Bind device if not bound
  IF v_student.activated_device_id IS NULL THEN
    UPDATE public.profiles SET activated_device_id = p_device_id WHERE id = v_student.id;
    v_student.activated_device_id := p_device_id;
  END IF;

  RETURN row_to_json(v_student)::jsonb;
END;
$$;

-- 8. RPC: Secure Progress Recording for Students (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.record_student_progress(p_student_id UUID, p_device_id TEXT, p_level_id INT, p_score INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student public.profiles%ROWTYPE;
BEGIN
  -- Verify the student and device
  SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id AND role = 'student';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  IF v_student.activated_device_id != p_device_id THEN
    RAISE EXCEPTION 'Unauthorized device.';
  END IF;

  -- Insert progress
  INSERT INTO public.progress (student_id, level_id, score) VALUES (p_student_id, p_level_id, p_score);
END;
$$;

-- 9. RPC: Check Staff Email (Bypasses RLS for pre-check)
CREATE OR REPLACE FUNCTION public.check_staff_email(p_email TEXT, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.profiles WHERE email = p_email AND role = p_role
  );
END;
$$;

-- 10. RPC: Verify Staff Login (Bypasses RLS to verify email and access code)
CREATE OR REPLACE FUNCTION public.verify_staff_login(p_email TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM public.profiles 
  WHERE email = p_email AND pin_hash = p_pin AND role IN ('admin', 'teacher');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid email or access code.';
  END IF;

  -- Sync the password to Supabase Auth to guarantee signInWithPassword works
  -- (This uses pgcrypto's bcrypt to match Supabase's hashing)
  UPDATE auth.users 
  SET encrypted_password = crypt(p_pin, gen_salt('bf'))
  WHERE email = p_email;

  -- Self-healing: if the auth.users account was deleted and recreated, 
  -- their UUID changed. We must sync the new UUID back to profiles!
  UPDATE public.profiles
  SET auth_id = (SELECT id FROM auth.users WHERE email = p_email LIMIT 1)
  WHERE email = p_email;

  -- Re-fetch to return the fresh profile with the correct auth_id
  SELECT * INTO v_user FROM public.profiles WHERE email = p_email;

  RETURN row_to_json(v_user)::jsonb;
END;
$$;

-- 11. Seed the initial Admin
INSERT INTO public.profiles (id, first_name, last_name, role, email, pin_hash) 
SELECT gen_random_uuid(), 'Master', 'Admin', 'admin', 'admin@school.com', 'ADMIN123'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' LIMIT 1);

-- 12. Add single-device login support column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_device_id TEXT;

-- 13. Secure RPC for Device Registration
-- Bypasses RLS so teachers can register their device ID during login
CREATE OR REPLACE FUNCTION register_device_session(p_profile_id UUID, p_auth_id UUID, p_device_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET auth_id = p_auth_id, current_device_id = p_device_id 
  WHERE id = p_profile_id;
END;
$$;
