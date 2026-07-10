-- Clear all rate limits just in case you were locked out
TRUNCATE TABLE public.login_attempts;

-- Forcefully reset the Master Admin password back to raw 'ADMIN123'
UPDATE public.profiles 
SET pin_hash = 'ADMIN123',
    current_device_id = NULL
WHERE email = 'admin@school.com';

UPDATE public.device_sessions
SET active = false,
    revoked_at = now()
WHERE profile_id = (SELECT id FROM public.profiles WHERE email = 'admin@school.com' LIMIT 1)
  AND active = true;
