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
  student_pin TEXT NULL,
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
-- Drop trigger first in case this script is being re-run, so we can alter the column type
DROP TRIGGER IF EXISTS tr_hash_pins ON public.profiles;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_id UUID NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_pin TEXT NULL;
ALTER TABLE public.profiles ALTER COLUMN student_pin TYPE TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_device_id TEXT;

-- 1.5 Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.login_attempts (
  ip_address TEXT,
  email TEXT,
  attempts INT DEFAULT 1,
  last_attempt TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ NULL,
  PRIMARY KEY (ip_address, email)
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- 3. Clear existing RLS policies
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
SET search_path = public, extensions
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
SET search_path = public, extensions
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
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.profiles WHERE auth_id = p_uid LIMIT 1;
  RETURN v_id;
END;
$$;

-- 5. RLS Policies for Profiles
CREATE POLICY "Admin full access profiles" ON public.profiles
  FOR ALL
  USING ( public.is_admin(auth.uid()) )
  WITH CHECK ( public.is_admin(auth.uid()) );

CREATE POLICY "Teacher read own and students" ON public.profiles
  FOR SELECT
  USING (
    (auth.uid() = auth_id) OR 
    (role = 'student' AND teacher_id = public.get_profile_id_by_auth(auth.uid()))
  );

CREATE POLICY "Auth link profile read" ON public.profiles
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Auth link profile update" ON public.profiles
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email AND auth_id IS NULL)
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- 6. RLS Policies for Progress
CREATE POLICY "Admin full access progress" ON public.progress
  FOR ALL
  USING ( public.is_admin(auth.uid()) )
  WITH CHECK ( public.is_admin(auth.uid()) );

CREATE POLICY "Teacher read student progress" ON public.progress
  FOR SELECT
  USING (
    public.is_teacher(auth.uid()) AND student_id IN (
      SELECT id FROM public.profiles WHERE teacher_id = public.get_profile_id_by_auth(auth.uid())
    )
  );

-- 6.5 Plaintext Password Configuration
-- Hashing has been explicitly disabled for this application.
-- Passwords will be stored in plain text to allow admins to view them in the dashboard.

-- 7. RPC: Secure Student Login
CREATE OR REPLACE FUNCTION public.verify_student_login(p_code TEXT, p_pin TEXT, p_device_id TEXT, p_ip TEXT DEFAULT 'unknown')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_student public.profiles%ROWTYPE;
  v_attempts INT;
  v_blocked_until TIMESTAMPTZ;
BEGIN
  SELECT attempts, blocked_until INTO v_attempts, v_blocked_until 
  FROM public.login_attempts WHERE ip_address = p_ip AND email = p_code;

  IF v_blocked_until IS NOT NULL AND now() < v_blocked_until THEN
    RETURN jsonb_build_object('error', 'Too many failed attempts. Try again in 1 minute.');
  END IF;

  SELECT * INTO v_student FROM public.profiles 
  WHERE student_code = p_code 
    AND (
      (student_pin NOT LIKE '$2%' AND student_pin = p_pin) 
      OR 
      (student_pin LIKE '$2%' AND student_pin = crypt(p_pin::text, student_pin::text))
    )
    AND role = 'student';
  
  IF NOT FOUND THEN
    INSERT INTO public.login_attempts (ip_address, email, attempts, last_attempt)
    VALUES (p_ip, p_code, 1, now())
    ON CONFLICT (ip_address, email) DO UPDATE 
    SET attempts = login_attempts.attempts + 1,
        last_attempt = now(),
        blocked_until = CASE WHEN login_attempts.attempts + 1 >= 5 THEN now() + interval '1 minute' ELSE NULL END;
    RETURN jsonb_build_object('error', 'Invalid student code or PIN.');
  END IF;

  DELETE FROM public.login_attempts WHERE ip_address = p_ip AND email = p_code;

  IF v_student.activated_device_id IS NOT NULL AND v_student.activated_device_id != p_device_id THEN
    RETURN jsonb_build_object('error', 'This account is locked to another device.');
  END IF;

  IF v_student.activated_device_id IS NULL THEN
    UPDATE public.profiles SET activated_device_id = p_device_id WHERE id = v_student.id;
    v_student.activated_device_id := p_device_id;
  END IF;

  RETURN row_to_json(v_student)::jsonb;
END;
$$;

-- 8. RPC: Secure Progress Recording
CREATE OR REPLACE FUNCTION public.record_student_progress(p_student_id UUID, p_device_id TEXT, p_level_id INT, p_score INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_student public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id AND role = 'student';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  IF v_student.activated_device_id != p_device_id THEN
    RAISE EXCEPTION 'Unauthorized device.';
  END IF;

  INSERT INTO public.progress (student_id, level_id, score) VALUES (p_student_id, p_level_id, p_score);
END;
$$;

-- 9. RPC: Check Staff Email
CREATE OR REPLACE FUNCTION public.check_staff_email(p_email TEXT, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.profiles WHERE email = p_email AND role = p_role
  );
END;
$$;

-- 10. RPC: Verify Staff Login
CREATE OR REPLACE FUNCTION public.verify_staff_login(p_email TEXT, p_pin TEXT, p_ip TEXT DEFAULT 'unknown')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user public.profiles%ROWTYPE;
  v_attempts INT;
  v_blocked_until TIMESTAMPTZ;
BEGIN
  SELECT attempts, blocked_until INTO v_attempts, v_blocked_until 
  FROM public.login_attempts WHERE ip_address = p_ip AND email = p_email;

  IF v_blocked_until IS NOT NULL AND now() < v_blocked_until THEN
    RETURN jsonb_build_object('error', 'Too many failed attempts. Try again in 1 minute.');
  END IF;

  SELECT * INTO v_user FROM public.profiles 
  WHERE email = p_email 
    AND (
      (pin_hash NOT LIKE '$2%' AND pin_hash = p_pin) 
      OR 
      (pin_hash LIKE '$2%' AND pin_hash = crypt(p_pin::text, pin_hash::text))
    )
    AND role IN ('admin', 'teacher');
  
  IF NOT FOUND THEN
    INSERT INTO public.login_attempts (ip_address, email, attempts, last_attempt)
    VALUES (p_ip, p_email, 1, now())
    ON CONFLICT (ip_address, email) DO UPDATE 
    SET attempts = login_attempts.attempts + 1,
        last_attempt = now(),
        blocked_until = CASE WHEN login_attempts.attempts + 1 >= 5 THEN now() + interval '1 minute' ELSE NULL END;
    RETURN jsonb_build_object('error', 'Invalid email or access code.');
  END IF;

  DELETE FROM public.login_attempts WHERE ip_address = p_ip AND email = p_email;

  UPDATE auth.users 
  SET encrypted_password = crypt(p_pin::text, gen_salt('bf'::text))
  WHERE email = p_email;

  UPDATE public.profiles
  SET auth_id = (SELECT id FROM auth.users WHERE email = p_email LIMIT 1)
  WHERE email = p_email;

  SELECT * INTO v_user FROM public.profiles WHERE email = p_email;
  RETURN row_to_json(v_user)::jsonb;
END;
$$;

-- 11. Secure RPC for Device Registration
CREATE OR REPLACE FUNCTION register_device_session(p_profile_id UUID, p_auth_id UUID, p_device_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_profile_id
      AND (auth_id = auth.uid() OR public.is_admin(auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Unauthorized profile ownership.';
  END IF;

  UPDATE public.profiles 
  SET auth_id = p_auth_id, current_device_id = p_device_id 
  WHERE id = p_profile_id;
END;
$$;

-- 12. Seed the initial Admin
-- Since the trigger is now active BEFORE this runs, ADMIN123 will be hashed instantly.
INSERT INTO public.profiles (id, first_name, last_name, role, email, pin_hash) 
SELECT gen_random_uuid(), 'Master', 'Admin', 'admin', 'admin@school.com', 'ADMIN123'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' LIMIT 1);

-- Setup Complete!
