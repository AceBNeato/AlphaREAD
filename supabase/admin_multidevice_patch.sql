-- Patch: Allow admins to use multiple devices simultaneously
-- Run this in your Supabase SQL Editor

-- 1. Update the unique index to exempt admins
DROP INDEX IF EXISTS public.device_sessions_one_active_device;

CREATE UNIQUE INDEX IF NOT EXISTS device_sessions_one_active_device
  ON public.device_sessions (profile_id)
  WHERE active = true AND role != 'admin';

-- 2. Update session validation to allow admins to bypass the single-device check
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

-- 3. Update device registration to allow admins to keep multiple sessions active
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
