-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'team_leader', 'operator');

-- Create enum for action status
CREATE TYPE public.action_status AS ENUM ('todo', 'in_progress', 'completed', 'overdue');

-- Create enum for action priority
CREATE TYPE public.action_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create enum for problem severity
CREATE TYPE public.problem_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for problem status
CREATE TYPE public.problem_status AS ENUM ('open', 'in_progress', 'resolved');

-- Create enum for KPI frequency
CREATE TYPE public.kpi_frequency AS ENUM ('daily', 'weekly', 'monthly');

-- Create enum for KPI trend
CREATE TYPE public.kpi_trend AS ENUM ('up', 'down', 'stable');

-- Create enum for KPI status
CREATE TYPE public.kpi_status AS ENUM ('green', 'orange', 'red');

-- Create enum for chart type
CREATE TYPE public.chart_type AS ENUM ('pareto', 'histogram', 'time_series', 'control_chart', 'box_plot');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'operator',
  UNIQUE (user_id, role)
);

-- Create SFM categories table
CREATE TABLE public.sfm_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code CHAR(1) NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create KPIs table
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.sfm_categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  target_value DECIMAL,
  frequency kpi_frequency DEFAULT 'daily',
  chart_type chart_type DEFAULT 'time_series',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create KPI values table for historical data
CREATE TABLE public.kpi_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID REFERENCES public.kpis(id) ON DELETE CASCADE NOT NULL,
  value DECIMAL NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  week_number INTEGER,
  trend kpi_trend DEFAULT 'stable',
  status kpi_status DEFAULT 'green',
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create actions table
CREATE TABLE public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.sfm_categories(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority action_priority DEFAULT 'medium',
  status action_status DEFAULT 'todo',
  responsible_id UUID REFERENCES auth.users(id),
  due_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create problems table
CREATE TABLE public.problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.sfm_categories(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity problem_severity DEFAULT 'medium',
  status problem_status DEFAULT 'open',
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  escalated BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.sfm_categories(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create smart alerts table
CREATE TABLE public.smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sfm_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for sfm_categories
CREATE POLICY "Anyone can view categories" ON public.sfm_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.sfm_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for kpis
CREATE POLICY "Anyone can view KPIs" ON public.kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and admins can manage KPIs" ON public.kpis FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- RLS Policies for kpi_values
CREATE POLICY "Anyone can view KPI values" ON public.kpi_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers and admins can manage KPI values" ON public.kpi_values FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- RLS Policies for actions
CREATE POLICY "Anyone can view actions" ON public.actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team leaders and above can manage actions" ON public.actions FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'team_leader'));

-- RLS Policies for problems
CREATE POLICY "Anyone can view problems" ON public.problems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create problems" ON public.problems FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Team leaders and above can manage problems" ON public.problems FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'team_leader'));

-- RLS Policies for notes
CREATE POLICY "Anyone can view notes" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can manage own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- RLS Policies for smart_alerts
CREATE POLICY "Anyone can view alerts" ON public.smart_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can create alerts" ON public.smart_alerts FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default SFM categories
INSERT INTO public.sfm_categories (name, code, color, icon, display_order) VALUES
  ('Sécurité', 'S', '#EF4444', 'shield', 1),
  ('Qualité', 'Q', '#3B82F6', 'check-circle', 2),
  ('Coût', 'C', '#22C55E', 'dollar-sign', 3),
  ('Livraison', 'D', '#8B5CF6', 'truck', 4),
  ('Performance', 'P', '#F59E0B', 'trending-up', 5),
  ('Humain', 'H', '#06B6D4', 'users', 6);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Utilisateur'), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kpis_updated_at BEFORE UPDATE ON public.kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON public.actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON public.problems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();