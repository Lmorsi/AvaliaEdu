/*
  # Auto Admin for Specific Emails

  1. New Function
    - `handle_new_user()` - Trigger function that automatically grants admin role to specific emails
  
  2. Changes
    - Create trigger on auth.users to automatically set admin role for lucasmorsi2@gmail.com
    - When the user registers, they will automatically receive admin privileges
  
  3. Security
    - Only specific whitelisted emails get auto-admin
    - Function runs on user creation
*/

-- Function to handle new user registration and auto-grant admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Check if email should be admin
  IF NEW.email = 'lucasmorsi2@gmail.com' THEN
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
