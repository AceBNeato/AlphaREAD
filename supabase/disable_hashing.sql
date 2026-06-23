-- 1. Drop the automatic hashing trigger
DROP TRIGGER IF EXISTS tr_hash_pins ON public.profiles;

-- 2. Drop the trigger function itself so it is completely removed from the system
DROP FUNCTION IF EXISTS public.hash_pins_trigger();
