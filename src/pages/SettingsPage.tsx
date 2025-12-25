import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Settings, 
  Bell, 
  Shield, 
  Building2, 
  Mail,
  Save,
  Loader2,
  User,
  Camera
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface NotificationSettings {
  email_alerts: boolean;
  action_reminders: boolean;
  problem_escalation: boolean;
  kpi_alerts: boolean;
}

interface AppSettings {
  company_name: string;
  timezone: string;
  language: string;
}

export default function SettingsPage() {
  const { role, profile, user, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  // Redirect non-authorized users
  if (!hasPermission(['admin', 'manager'])) {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch user notification settings
  const { data: userSettings, isLoading: userSettingsLoading } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch app settings (admin only)
  const { data: appSettingsData, isLoading: appSettingsLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) throw error;
      
      const settings: AppSettings = {
        company_name: 'Mon Entreprise',
        timezone: 'Europe/Paris',
        language: 'fr',
      };
      
      data?.forEach(item => {
        if (item.key in settings) {
          (settings as any)[item.key] = item.value;
        }
      });
      
      return settings;
    },
    enabled: role === 'admin',
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_alerts: true,
    action_reminders: true,
    problem_escalation: true,
    kpi_alerts: true,
  });

  const [appSettings, setAppSettings] = useState<AppSettings>({
    company_name: 'Mon Entreprise',
    timezone: 'Europe/Paris',
    language: 'fr',
  });

  const [profileData, setProfileData] = useState({
    full_name: '',
    avatar_url: '',
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (userSettings) {
      setNotifications({
        email_alerts: userSettings.email_alerts ?? true,
        action_reminders: userSettings.action_reminders ?? true,
        problem_escalation: userSettings.problem_escalation ?? true,
        kpi_alerts: userSettings.kpi_alerts ?? true,
      });
    }
  }, [userSettings]);

  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (appSettingsData) {
      setAppSettings(appSettingsData);
    }
  }, [appSettingsData]);

  // Save notification settings mutation
  const saveNotificationsMutation = useMutation({
    mutationFn: async (settings: NotificationSettings) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_settings')
          .update(settings)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, ...settings });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast.success('Paramètres de notification enregistrés');
    },
    onError: (error) => {
      console.error('Error saving notifications:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  // Save app settings mutation (admin only)
  const saveAppSettingsMutation = useMutation({
    mutationFn: async (settings: AppSettings) => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_by: user?.id,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: update.value, updated_by: update.updated_by })
          .eq('key', update.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Paramètres de l\'application enregistrés');
    },
    onError: (error) => {
      console.error('Error saving app settings:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  // Save profile mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; avatar_url: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profil mis à jour avec succès');
    },
    onError: (error) => {
      console.error('Error saving profile:', error);
      toast.error('Erreur lors de la sauvegarde du profil');
    },
  });

  const handleSaveProfile = () => {
    saveProfileMutation.mutate(profileData);
  };

  const handleSaveNotifications = () => {
    saveNotificationsMutation.mutate(notifications);
  };

  const handleSaveApp = () => {
    saveAppSettingsMutation.mutate(appSettings);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isLoading = userSettingsLoading || (role === 'admin' && appSettingsLoading);

  return (
    <AppLayout title="Paramètres" subtitle="Configuration de l'application">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Mon Profil
            </CardTitle>
            <CardDescription>
              Gérez vos informations personnelles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profileData.avatar_url} alt={profileData.full_name} />
                <AvatarFallback className="text-lg bg-primary/20 text-primary">
                  {getInitials(profileData.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{profileData.full_name || 'Utilisateur'}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                value={profileData.full_name}
                onChange={(e) => 
                  setProfileData(prev => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Votre nom complet"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">URL de l'avatar</Label>
              <div className="flex gap-2">
                <Input
                  id="avatarUrl"
                  value={profileData.avatar_url}
                  onChange={(e) => 
                    setProfileData(prev => ({ ...prev, avatar_url: e.target.value }))
                  }
                  placeholder="https://exemple.com/avatar.jpg"
                />
                <Button variant="outline" size="icon" disabled>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Entrez l'URL d'une image pour votre avatar
              </p>
            </div>

            <Button 
              onClick={handleSaveProfile} 
              className="w-full"
              disabled={saveProfileMutation.isPending}
            >
              {saveProfileMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer le profil
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Settings */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configurez les alertes et rappels automatiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {userSettingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailAlerts">Alertes par email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir les alertes importantes par email
                    </p>
                  </div>
                  <Switch
                    id="emailAlerts"
                    checked={notifications.email_alerts}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, email_alerts: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="actionReminders">Rappels d'actions</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications pour les actions à échéance proche
                    </p>
                  </div>
                  <Switch
                    id="actionReminders"
                    checked={notifications.action_reminders}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, action_reminders: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="problemEscalation">Escalade problèmes</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertes lors de l'escalade de problèmes critiques
                    </p>
                  </div>
                  <Switch
                    id="problemEscalation"
                    checked={notifications.problem_escalation}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, problem_escalation: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="kpiAlerts">Alertes KPI</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications quand un KPI passe au rouge
                    </p>
                  </div>
                  <Switch
                    id="kpiAlerts"
                    checked={notifications.kpi_alerts}
                    onCheckedChange={(checked) => 
                      setNotifications(prev => ({ ...prev, kpi_alerts: checked }))
                    }
                  />
                </div>

                <Button 
                  onClick={handleSaveNotifications} 
                  className="w-full mt-4"
                  disabled={saveNotificationsMutation.isPending}
                >
                  {saveNotificationsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Application Settings - Admin only */}
        {role === 'admin' && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Application
              </CardTitle>
              <CardDescription>
                Paramètres généraux de l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {appSettingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nom de l'entreprise</Label>
                    <Input
                      id="companyName"
                      value={appSettings.company_name}
                      onChange={(e) => 
                        setAppSettings(prev => ({ ...prev, company_name: e.target.value }))
                      }
                      placeholder="Nom de votre entreprise"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <Input
                      id="timezone"
                      value={appSettings.timezone}
                      onChange={(e) => 
                        setAppSettings(prev => ({ ...prev, timezone: e.target.value }))
                      }
                      placeholder="Europe/Paris"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Langue</Label>
                    <Input
                      id="language"
                      value={appSettings.language}
                      onChange={(e) => 
                        setAppSettings(prev => ({ ...prev, language: e.target.value }))
                      }
                      placeholder="fr"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Seul le français est disponible actuellement
                    </p>
                  </div>

                  <Button 
                    onClick={handleSaveApp} 
                    className="w-full mt-4"
                    disabled={saveAppSettingsMutation.isPending}
                  >
                    {saveAppSettingsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Security Info */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Informations sur votre compte et sécurité
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-[hsl(var(--status-green))]/20 text-[hsl(var(--status-green))] border-[hsl(var(--status-green))]/30">
                Vérifié
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Rôle</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {role === 'admin' ? 'Administrateur' : 
                     role === 'manager' ? 'Manager' :
                     role === 'team_leader' ? "Chef d'équipe" : 'Opérateur'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              À propos
            </CardTitle>
            <CardDescription>
              Informations sur l'application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Version</p>
              <Badge variant="outline">1.0.0</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Nom de l'application</p>
              <p className="text-sm text-muted-foreground">SFM Digital</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">Description</p>
              <p className="text-sm text-muted-foreground">Gestion Lean Manufacturing</p>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Application de gestion de la performance opérationnelle basée sur les principes du Shop Floor Management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
