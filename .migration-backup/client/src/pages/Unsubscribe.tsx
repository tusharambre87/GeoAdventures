import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Mail, ArrowLeft, Heart, X } from "lucide-react";

export default function Unsubscribe() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState<string>("");
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [resubscribed, setResubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setUnsubscribed(true);
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
    setLoading(false);
  };

  const handleResubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setResubscribed(true);
        setUnsubscribed(false);
      }
    } catch (error) {
      console.error('Failed to resubscribe:', error);
    }
    setLoading(false);
  };

  if (resubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Welcome Back!</CardTitle>
            <CardDescription className="text-gray-600">
              You've been resubscribed to GeoQuest emails.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-500 text-sm">
              We're glad you changed your mind! You'll receive weekly progress reports and daily quest reminders.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to GeoQuest
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-gray-600" />
            </div>
            <CardTitle className="text-2xl text-gray-700">You've Been Unsubscribed</CardTitle>
            <CardDescription className="text-gray-600">
              {email && `We've removed ${email} from our mailing list.`}
              {!email && "You've been removed from our mailing list."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-500 text-sm">
              You will no longer receive emails from GeoQuest Games.
            </p>
            
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-5 border border-pink-200">
              <div className="text-4xl mb-3">💝</div>
              <p className="font-semibold text-purple-800 mb-2">Changed your mind?</p>
              <p className="text-sm text-purple-600 mb-4">
                We'd love to keep you updated on your explorer's progress!
              </p>
              <Button
                onClick={handleResubscribe}
                disabled={loading}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                data-testid="button-resubscribe"
              >
                <Heart className="w-4 h-4 mr-2" />
                {loading ? "Processing..." : "Yes, sign me up again!"}
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => setLocation("/")}
              className="text-gray-500 hover:text-gray-700"
              data-testid="button-close"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-10 h-10 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl text-gray-800">Unsubscribe from Emails</CardTitle>
          <CardDescription className="text-gray-600">
            {email ? `Unsubscribe ${email} from GeoQuest emails?` : "Unsubscribe from GeoQuest emails?"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-500 text-sm text-center">
            By unsubscribing, you will no longer receive:
          </p>
          <ul className="text-sm text-gray-600 space-y-2 pl-4">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              Weekly progress reports
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              Daily quest reminders
            </li>
          </ul>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="flex-1"
              data-testid="button-cancel-unsubscribe"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-unsubscribe"
            >
              {loading ? "Processing..." : "Unsubscribe"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
