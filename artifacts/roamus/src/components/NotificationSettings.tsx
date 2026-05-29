import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle2, Plane, Calendar, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isIOS,
    needsIOSInstall,
    preferences,
    subscribe,
    unsubscribe,
    sendTestNotification,
    updatePreferences,
  } = usePushNotifications();

  if (!isSupported && !isIOS) {
    return (
      <Card data-testid="notification-settings-unsupported">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your browser doesn't support push notifications. Try using Chrome, Firefox, or Safari on a supported device.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (needsIOSInstall) {
    return (
      <Card data-testid="notification-settings-ios-install">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Add to Home Screen First
          </CardTitle>
          <CardDescription>
            iOS requires the app to be installed before enabling notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <p className="font-medium">To enable notifications on iOS:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Tap the <strong>Share</strong> button in Safari</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> in the top right</li>
              <li>Open GeoQuest from your home screen</li>
              <li>Come back here to enable notifications</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: Push notifications require iOS 16.4 or later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (permission === 'denied') {
    return (
      <Card data-testid="notification-settings-denied">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Notifications Blocked
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Notifications are blocked for this site. To enable them:
          </p>
          <div className="bg-muted rounded-lg p-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Click the lock/info icon in your browser's address bar</li>
              <li>Find "Notifications" in the site settings</li>
              <li>Change it from "Block" to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="notification-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get reminders about Daily Quest and streak protection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSubscribed ? (
          <>
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Notifications enabled</span>
            </div>
            
            {preferences && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Notification Types</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plane className="h-4 w-4 text-blue-500" />
                      <Label htmlFor="geo-adventures" className="text-sm">
                        GeoAdventures Travel Updates
                      </Label>
                    </div>
                    <Switch
                      id="geo-adventures"
                      checked={preferences.geoAdventuresNotifications}
                      onCheckedChange={(checked) => updatePreferences({ geoAdventuresNotifications: checked })}
                      disabled={isLoading}
                      data-testid="switch-geo-adventures-notifications"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Get notified about your family travel adventures
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <Label htmlFor="daily-quest" className="text-sm">
                        Daily Quest Reminders
                      </Label>
                    </div>
                    <Switch
                      id="daily-quest"
                      checked={preferences.dailyQuestReminders}
                      onCheckedChange={(checked) => updatePreferences({ dailyQuestReminders: checked })}
                      disabled={isLoading}
                      data-testid="switch-daily-quest-reminders"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Gentle reminder at 6pm if no one has played yet
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <Label htmlFor="monthly" className="text-sm">
                        Monthly Updates
                      </Label>
                    </div>
                    <Switch
                      id="monthly"
                      checked={preferences.monthlyUpdates}
                      onCheckedChange={(checked) => updatePreferences({ monthlyUpdates: checked })}
                      disabled={isLoading}
                      data-testid="switch-monthly-updates"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Explorer growth summaries and memory reflections
                  </p>
                </div>
                <Separator className="my-4" />
              </>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={sendTestNotification}
                disabled={isLoading}
                data-testid="button-test-notification"
              >
                Send Test
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={unsubscribe}
                disabled={isLoading}
                data-testid="button-disable-notifications"
              >
                <BellOff className="h-4 w-4 mr-1" />
                Disable
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Enable notifications to get daily reminders and protect your streak.
            </p>
            <Button
              onClick={subscribe}
              disabled={isLoading}
              data-testid="button-enable-notifications"
            >
              <Bell className="h-4 w-4 mr-2" />
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
