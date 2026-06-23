-- Clear all rate limits just in case you were locked out
TRUNCATE TABLE public.login_attempts;

-- Forcefully reset the Master Admin password back to raw 'ADMIN123'
UPDATE public.profiles 
SET pin_hash = 'ADMIN123' 
WHERE email = 'admin@school.com';

-- Now manually trigger the hash so we know with 100% certainty it hashed correctly
UPDATE public.profiles 
SET pin_hash = pin_hash 
WHERE email = 'admin@school.com' AND pin_hash NOT LIKE '$2%';
