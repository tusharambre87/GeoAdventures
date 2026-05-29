import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle, Settings, ArrowLeft, Loader2 } from "lucide-react";
import { NotificationSettings } from "@/components/NotificationSettings";

interface EmailPreferences {
  emailSubscribed: boolean;
  weeklyProgressEmails: boolean;
  dailyReminderEmails: boolean;
}

export default function EmailPreferences() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [preferences, setPreferences] = useState<EmailPreferences>({
    emailSubscribed: true,
    weeklyProgressEmails: true,
    dailyReminderEmails: true,
  });

  const [returnPath, setReturnPath] = useState('/');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const fromParam = params.get("from");
    
    if (fromParam === 'parent-dashboard') {
      setReturnPath('/parent-dashboard');
    }
    
    if (emailParam) {
      setEmail(emailParam);
      fetchPreferences(emailParam);
    } else {
      setFetching(false);
    }
  }, []);

  const fetchPreferences = async (userEmail: string) => {
    try {
      const response = await fetch(`/api/email/preferences?email=${encodeURIComponent(userEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
    setFetching(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, preferences }),
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
    setLoading(false);
  };

  const handleToggleAll = (enabled: boolean) => {
    setPreferences({
      emailSubscribed: enabled,
      weeklyProgressEmails: enabled,
      dailyReminderEmails: enabled,
    });
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-4 gap-6">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Settings className="w-10 h-10 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl text-gray-800">Email Preferences</CardTitle>
          <CardDescription className="text-gray-600">
            {email ? `Manage email preferences for ${email}` : "Manage your email preferences"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="space-y-1">
              <Label htmlFor="all-emails" className="font-semibold text-gray-800">
                All Emails
              </Label>
              <p className="text-sm text-gray-500">
                Turn on/off all email notifications
              </p>
            </div>
            <Switch
              id="all-emails"
              checked={preferences.emailSubscribed}
              onCheckedChange={(checked) => handleToggleAll(checked)}
              data-testid="switch-all-emails"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="weekly-progress" className="font-medium text-gray-800">
                  Weekly Progress Reports
                </Label>
                <p className="text-sm text-gray-500">
                  Get a summary of your child's learning progress every week
                </p>
              </div>
              <Switch
                id="weekly-progress"
                checked={preferences.weeklyProgressEmails}
                disabled={!preferences.emailSubscribed}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, weeklyProgressEmails: checked }))
                }
                data-testid="switch-weekly-progress"
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="daily-reminders" className="font-medium text-gray-800">
                  Daily Quest Reminders
                </Label>
                <p className="text-sm text-gray-500">
                  Reminders about new daily quests and streak updates
                </p>
              </div>
              <Switch
                id="daily-reminders"
                checked={preferences.dailyReminderEmails}
                disabled={!preferences.emailSubscribed}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, dailyReminderEmails: checked }))
                }
                data-testid="switch-daily-reminders"
              />
            </div>
          </div>

          {saved && (
            <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Preferences saved!</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setLocation(returnPath)}
              className="flex-1"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-save-preferences"
            >
              {loading ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <NotificationSettings />
    </div>
  );

}
