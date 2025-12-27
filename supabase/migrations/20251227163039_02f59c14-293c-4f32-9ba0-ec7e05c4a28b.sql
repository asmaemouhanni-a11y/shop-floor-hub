-- Fix notes: remove INSERT permission for operators (only managers and team_leaders can create)
DROP POLICY IF EXISTS "Anyone can create notes" ON public.notes;

CREATE POLICY "Team leaders and above can create notes" 
ON public.notes 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'team_leader'::app_role)
);

-- Update notes UPDATE policy to include team_leaders
DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;

CREATE POLICY "Team leaders and above can update notes" 
ON public.notes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'team_leader'::app_role)
);

-- Update notes DELETE policies
DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
DROP POLICY IF EXISTS "Managers can delete any notes" ON public.notes;

CREATE POLICY "Team leaders and above can delete notes" 
ON public.notes 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'team_leader'::app_role)
);