-- AlphabetGO production hardening migration
-- Run this after setup_security.sql in the Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Stable constraints for hosted use.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_student_code_unique
  ON public.profiles (student_code)
  WHERE student_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS progress_student_level_unique
  ON public.progress (student_id, level_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS device_sessions_one_active_device
  ON public.device_sessions (profile_id)
  WHERE active = true AND role != 'admin';

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read audit logs" ON public.audit_logs;
CREATE POLICY "Admin read audit logs" ON public.audit_logs
  FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin read device sessions" ON public.device_sessions;
CREATE POLICY "Admin read device sessions" ON public.device_sessions
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN public.get_profile_id_by_auth(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit(p_action TEXT, p_target_id UUID DEFAULT NULL, p_details JSONB DEFAULT '{}'::jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, target_id, details)
  VALUES (public.get_current_profile_id(), p_action, p_target_id, COALESCE(p_details, '{}'::jsonb));
END;
$$;

-- Hash access codes/PINs when direct profile writes still happen during migration.
CREATE OR REPLACE FUNCTION public.hash_profile_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.pin_hash IS NOT NULL AND NEW.pin_hash NOT LIKE '$2%' THEN
      NEW.pin_hash := crypt(NEW.pin_hash::text, gen_salt('bf'::text));
      NEW.pin_last_changed := now();
    END IF;

    IF NEW.student_pin IS NOT NULL AND NEW.student_pin NOT LIKE '$2%' THEN
      NEW.student_pin := crypt(NEW.student_pin::text, gen_salt('bf'::text));
      NEW.pin_last_changed := now();
    END IF;
  ELSE
    IF NEW.pin_hash IS NOT NULL
      AND NEW.pin_hash IS DISTINCT FROM OLD.pin_hash
      AND NEW.pin_hash NOT LIKE '$2%' THEN
      NEW.pin_hash := crypt(NEW.pin_hash::text, gen_salt('bf'::text));
      NEW.pin_last_changed := now();
    END IF;

    IF NEW.student_pin IS NOT NULL
      AND NEW.student_pin IS DISTINCT FROM OLD.student_pin
      AND NEW.student_pin NOT LIKE '$2%' THEN
      NEW.student_pin := crypt(NEW.student_pin::text, gen_salt('bf'::text));
      NEW.pin_last_changed := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_hash_profile_codes ON public.profiles;
CREATE TRIGGER tr_hash_profile_codes
BEFORE INSERT OR UPDATE OF pin_hash, student_pin ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.hash_profile_codes();

CREATE OR REPLACE FUNCTION public.generate_access_code(p_length INT DEFAULT 8)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  output TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..p_length LOOP
    output := output || substr(chars, 1 + floor(random() * length(chars))::INT, 1);
  END LOOP;
  RETURN output;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_profile_session(p_profile_id UUID, p_role TEXT, p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_profile_id
    AND role = p_role;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'profile_not_found');
  END IF;

  IF p_role = 'student' THEN
    IF p_device_id IS NULL OR v_profile.activated_device_id IS DISTINCT FROM p_device_id THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'device_revoked');
    END IF;
  ELSIF p_role = 'teacher' THEN
    IF p_device_id IS NULL OR v_profile.current_device_id IS DISTINCT FROM p_device_id THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'device_revoked');
    END IF;
  ELSIF p_role = 'admin' THEN
    -- Admins are allowed to be active on multiple devices
    NULL;
  ELSE
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_role');
  END IF;

  UPDATE public.device_sessions
  SET last_seen_at = now()
  WHERE profile_id = p_profile_id
    AND device_id = p_device_id
    AND active = true;

  RETURN jsonb_build_object('valid', true, 'role', v_profile.role);
END;
$$;

CREATE OR REPLACE FUNCTION public.register_device_session(p_profile_id UUID, p_auth_id UUID, p_device_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF NOT (
    v_profile.auth_id = auth.uid()
    OR p_auth_id = auth.uid()
    OR public.is_admin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized profile ownership.';
  END IF;

  IF v_profile.role != 'admin' THEN
    IF v_profile.current_device_id IS NOT NULL AND v_profile.current_device_id != p_device_id THEN
      RAISE EXCEPTION 'This account is already signed in on another device.';
    END IF;

    UPDATE public.device_sessions
    SET active = false, revoked_at = now()
    WHERE profile_id = p_profile_id
      AND active = true
      AND device_id != p_device_id;
  END IF;

  INSERT INTO public.device_sessions (profile_id, device_id, role, active)
  VALUES (p_profile_id, p_device_id, v_profile.role, true)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET auth_id = COALESCE(p_auth_id, auth_id),
      current_device_id = p_device_id
  WHERE id = p_profile_id;
END;
$$;

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

  IF v_student.activated_device_id IS DISTINCT FROM p_device_id THEN
    RAISE EXCEPTION 'Unauthorized device.';
  END IF;

  INSERT INTO public.progress (student_id, level_id, score)
  VALUES (p_student_id, p_level_id, p_score)
  ON CONFLICT (student_id, level_id)
  DO UPDATE SET score = GREATEST(public.progress.score, EXCLUDED.score),
                completed_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_completed_levels(p_student_id UUID, p_device_id TEXT)
RETURNS INT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_levels INT[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_student_id
      AND role = 'student'
      AND activated_device_id = p_device_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized device.';
  END IF;

  SELECT COALESCE(array_agg(level_id ORDER BY level_id), ARRAY[]::INT[])
  INTO v_levels
  FROM public.progress
  WHERE student_id = p_student_id;

  RETURN v_levels;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_teacher(p_first_name TEXT, p_email TEXT, p_access_code TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_code TEXT := COALESCE(NULLIF(upper(trim(p_access_code)), ''), public.generate_access_code(8));
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, role, email, avatar, pin_hash)
  VALUES (v_id, trim(p_first_name), 'Teacher', 'teacher', lower(trim(p_email)), '👩‍🏫', v_code);

  PERFORM public.log_audit('teacher.create', v_id, jsonb_build_object('email', lower(trim(p_email))));
  RETURN jsonb_build_object('id', v_id, 'access_code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_student(
  p_first_name TEXT,
  p_last_name TEXT,
  p_class_code TEXT,
  p_teacher_id UUID DEFAULT NULL,
  p_pin TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_pin TEXT := COALESCE(NULLIF(upper(trim(p_pin)), ''), public.generate_access_code(6));
  v_prefix TEXT;
  v_code TEXT;
  v_max_seq INT := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('alphabetgo_student_code_generation'));

  v_prefix := upper(
    substr(regexp_replace(trim(p_first_name), '[^A-Za-z]', '', 'g') || 'XXX', 1, 3)
    || substr(regexp_replace(trim(p_last_name), '[^A-Za-z]', '', 'g') || 'X', 1, 1)
  );

  SELECT COALESCE(MAX(NULLIF(regexp_replace(substr(student_code, 5), '[^0-9]', '', 'g'), '')::INT), 0)
  INTO v_max_seq
  FROM public.profiles
  WHERE student_code IS NOT NULL;

  v_code := v_prefix || lpad((v_max_seq + 1)::TEXT, 3, '0');

  INSERT INTO public.profiles (
    id, first_name, last_name, role, student_code, student_pin, avatar, class_code, teacher_id
  )
  VALUES (
    v_id, trim(p_first_name), trim(p_last_name), 'student', v_code, v_pin, '👦', upper(trim(p_class_code)), p_teacher_id
  );

  PERFORM public.log_audit('student.create', v_id, jsonb_build_object('student_code', v_code));
  RETURN jsonb_build_object('id', v_id, 'student_code', v_code, 'student_pin', v_pin);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_staff_access_code(
  p_profile_id UUID,
  p_access_code TEXT DEFAULT NULL,
  p_revoke_sessions BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_code TEXT := COALESCE(NULLIF(upper(trim(p_access_code)), ''), public.generate_access_code(8));
BEGIN
  IF NOT public.is_admin(auth.uid()) AND public.get_current_profile_id() IS DISTINCT FROM p_profile_id THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  UPDATE public.profiles
  SET pin_hash = v_code,
      current_device_id = CASE WHEN p_revoke_sessions THEN NULL ELSE current_device_id END
  WHERE id = p_profile_id
    AND role IN ('admin', 'teacher');

  IF p_revoke_sessions THEN
    UPDATE public.device_sessions SET active = false, revoked_at = now()
    WHERE profile_id = p_profile_id AND active = true;
  END IF;

  PERFORM public.log_audit('staff.access_code.reset', p_profile_id);
  RETURN jsonb_build_object('access_code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_teacher(p_profile_id UUID, p_first_name TEXT, p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  UPDATE public.profiles
  SET first_name = trim(p_first_name),
      email = lower(trim(p_email))
  WHERE id = p_profile_id
    AND role = 'teacher';

  PERFORM public.log_audit('teacher.update', p_profile_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_teacher(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  UPDATE public.profiles SET teacher_id = NULL WHERE teacher_id = p_profile_id;
  DELETE FROM public.profiles WHERE id = p_profile_id AND role = 'teacher';

  PERFORM public.log_audit('teacher.delete', p_profile_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_student_pin(p_profile_id UUID, p_pin TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pin TEXT := COALESCE(NULLIF(upper(trim(p_pin)), ''), public.generate_access_code(6));
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  UPDATE public.profiles
  SET student_pin = v_pin,
      activated_device_id = NULL
  WHERE id = p_profile_id
    AND role = 'student';

  UPDATE public.device_sessions SET active = false, revoked_at = now()
  WHERE profile_id = p_profile_id AND active = true;

  PERFORM public.log_audit('student.pin.reset', p_profile_id);
  RETURN jsonb_build_object('student_pin', v_pin);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_student(
  p_profile_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_class_code TEXT,
  p_teacher_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  UPDATE public.profiles
  SET first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      class_code = upper(trim(p_class_code)),
      teacher_id = p_teacher_id
  WHERE id = p_profile_id
    AND role = 'student';

  PERFORM public.log_audit('student.update', p_profile_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_student(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;

  DELETE FROM public.profiles WHERE id = p_profile_id AND role = 'student';
  PERFORM public.log_audit('student.delete', p_profile_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unlock_device(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor_id UUID := public.get_current_profile_id();
  v_target public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  IF NOT public.is_admin(auth.uid()) AND NOT (
    public.is_teacher(auth.uid())
    AND v_target.role = 'student'
    AND v_target.teacher_id = v_actor_id
  ) THEN
    RAISE EXCEPTION 'Staff access required.';
  END IF;

  UPDATE public.profiles
  SET activated_device_id = CASE WHEN role = 'student' THEN NULL ELSE activated_device_id END,
      current_device_id = CASE WHEN role IN ('admin', 'teacher') THEN NULL ELSE current_device_id END
  WHERE id = p_profile_id;

  UPDATE public.device_sessions SET active = false, revoked_at = now()
  WHERE profile_id = p_profile_id AND active = true;

  PERFORM public.log_audit('device.unlock', p_profile_id);
END;
$$;
