-- Add push notification columns to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS push_kpi_alerts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_action_reminders boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS push_problem_alerts boolean DEFAULT true;