DO $$
DECLARE
    r RECORD;
    prefix TEXT;
    seq_num INT;
    new_code TEXT;
BEGIN
    -- Step 1: Find the absolute highest numeric value currently used by any student in the entire database
    SELECT COALESCE(MAX(CAST(NULLIF(regexp_replace(student_code, '\D', '', 'g'), '') AS INT)), 0)
    INTO seq_num
    FROM public.profiles
    WHERE role = 'student' AND student_code ~ '^[A-Z]{4}[0-9]+$';

    -- Step 2: Loop through all students who do not yet have the new mnemonic code format
    FOR r IN SELECT * FROM public.profiles WHERE role = 'student' AND student_code !~ '^[A-Z]{4}[0-9]+$' ORDER BY created_at ASC
    LOOP
        -- Calculate prefix: First 3 letters of first name + First letter of last name
        prefix := UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(r.first_name, ''), '[^A-Za-z]', '', 'g') || 'XXX' FROM 1 FOR 3)) || 
                  UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(r.last_name, ''), '[^A-Za-z]', '', 'g') || 'X' FROM 1 FOR 1));
                  
        -- Increment the global sequence by 1
        seq_num := seq_num + 1;
        new_code := prefix || LPAD(seq_num::text, 3, '0');
        
        -- Update the student's code
        UPDATE public.profiles SET student_code = new_code WHERE id = r.id;
    END LOOP;
END;
$$;
