import { useEffect, useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';

export function PushNotificationPrompt() {
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const wasDismissed = localStorage.getItem('push-notification-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after a short delay if permission not yet decided
    if (isSupported && permission === 'default') {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleAccept = async () => {
    await requestPermission();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('push-notification-dismissed', 'true');
    setDismissed(true);
    setShowPrompt(false);
  };

  if (!showPrompt || dismissed || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <Card className="w-80 shadow-lg border-border/50 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1">Activer les notifications</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Recevez des alertes en temps réel pour les KPIs critiques, actions en retard et problèmes urgents.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleAccept}
                  className="flex-1"
                >
                  Autoriser
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
