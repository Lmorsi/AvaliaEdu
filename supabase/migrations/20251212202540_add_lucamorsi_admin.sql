/*
  # Add lucamorsi@gmail.com as Auto Admin
  
  1. Changes
    - Update `handle_new_user()` function to include lucamorsi@gmail.com
    - Both lucasmorsi2@gmail.com and lucamorsi@gmail.com will now get admin automatically
  
  2. Security
    - Maintains existing security model
    - Only whitelisted emails receive admin privileges
*/

-- Update function to include new admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Check if email should be admin
  IF NEW.email IN ('lucasmorsi2@gmail.com', 'lucamorsi@gmail.com') THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;

  -- Insert user profile with appropriate role
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_role
  );

  RETURN NEW;
END;
$$;
