-- Create app_settings table for global application settings
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Create user_settings table for per-user notification preferences
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_alerts boolean DEFAULT true,
  action_reminders boolean DEFAULT true,
  problem_escalation boolean DEFAULT true,
  kpi_alerts boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS for app_settings: anyone can read, only admins can modify
CREATE POLICY "Anyone can view app settings"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage app settings"
ON public.app_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS for user_settings: users can manage their own settings
CREATE POLICY "Users can view own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default app settings
INSERT INTO public.app_settings (key, value) VALUES
  ('company_name', 'Mon Entreprise'),
  ('timezone', 'Europe/Paris'),
  ('language', 'fr');

-- Trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();