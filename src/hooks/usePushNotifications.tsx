import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface PushNotificationSettings {
  push_enabled: boolean;
  push_kpi_alerts: boolean;
  push_action_reminders: boolean;
  push_problem_alerts: boolean;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [settings, setSettings] = useState<PushNotificationSettings>({
    push_enabled: false,
    push_kpi_alerts: true,
    push_action_reminders: true,
    push_problem_alerts: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Register service worker
  useEffect(() => {
    if (!isSupported) return;

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  }, [isSupported]);

  // Load user settings
  useEffect(() => {
    if (!user?.id) return;

    const loadSettings = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          push_enabled: (data as any).push_enabled ?? false,
          push_kpi_alerts: (data as any).push_kpi_alerts ?? true,
          push_action_reminders: (data as any).push_action_reminders ?? true,
          push_problem_alerts: (data as any).push_problem_alerts ?? true,
        });
      }
    };

    loadSettings();
  }, [user?.id]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted' && user?.id) {
        // Save to database
        const { data: existing } = await supabase
          .from('user_settings')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_settings')
            .update({ push_enabled: true } as any)
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_settings')
            .insert({ user_id: user.id, push_enabled: true } as any);
        }

        setSettings(prev => ({ ...prev, push_enabled: true }));
        queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      }

      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, user?.id, queryClient]);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<PushNotificationSettings>) => {
    if (!user?.id) return false;

    try {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const updatedSettings = { ...settings, ...newSettings };

      if (existing) {
        await supabase
          .from('user_settings')
          .update(newSettings as any)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_settings')
          .insert({ user_id: user.id, ...updatedSettings } as any);
      }

      setSettings(updatedSettings);
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      return true;
    } catch (error) {
      console.error('Error updating push settings:', error);
      return false;
    }
  }, [user?.id, settings, queryClient]);

  // Show notification
  const showNotification = useCallback((title: string, options?: NotificationOptions & { url?: string }) => {
    if (!isSupported || permission !== 'granted' || !settings.push_enabled) return;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      if (options?.url) {
        notification.onclick = () => {
          window.focus();
          window.location.href = options.url!;
          notification.close();
        };
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isSupported, permission, settings.push_enabled]);

  // Subscribe to realtime alerts
  useEffect(() => {
    if (!user?.id || !isSupported || permission !== 'granted' || !settings.push_enabled) return;

    const channel = supabase
      .channel('push-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'smart_alerts',
        },
        (payload) => {
          const alert = payload.new as {
            id: string;
            title: string | null;
            type: string;
            message: string;
            severity: string;
            related_type: string | null;
            related_id: string | null;
          };

          // Check settings for notification type
          const shouldNotify = () => {
            if (alert.type === 'kpi_critical' && !settings.push_kpi_alerts) return false;
            if (alert.type === 'action_overdue' && !settings.push_action_reminders) return false;
            if ((alert.type === 'problem_critical' || alert.type === 'problem_high') && !settings.push_problem_alerts) return false;
            return true;
          };

          if (!shouldNotify()) return;

          // Determine redirect URL
          let url = '/alerts';
          if (alert.related_type === 'action') {
            url = '/actions';
          } else if (alert.related_type === 'kpi') {
            url = '/dashboard';
          } else if (alert.related_type === 'problem') {
            url = '/problems';
          }

          showNotification(alert.title || 'Nouvelle alerte', {
            body: alert.message,
            tag: alert.id,
            requireInteraction: alert.severity === 'critical' || alert.severity === 'high',
            url,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isSupported, permission, settings, showNotification]);

  return {
    isSupported,
    permission,
    settings,
    requestPermission,
    updateSettings,
    showNotification,
  };
}
