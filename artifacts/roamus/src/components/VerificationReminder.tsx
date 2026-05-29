import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Star, Cloud, Loader2, CheckCircle, Mail, X } from "lucide-react";

interface VerificationReminderProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
  starsEarned?: number;
}

export function VerificationReminder({ isOpen, onClose, email: propEmail, starsEarned }: VerificationReminderProps) {
  const [step, setStep] = useState<"PROMPT" | "VERIFY">("PROMPT");
  const [email, setEmail] = useState(propEmail || "");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (propEmail) {
      setEmail(propEmail);
    }
  }, [propEmail]);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.verified) {
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
        return;
      }

      if (!res.ok) {
        throw new Error(data.message || "Failed to send code");
      }

      startResendTimer();
      setStep("VERIFY");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch('/api/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Invalid code");
      }

      setSuccess(true);
      
      const savedEmail = localStorage.getItem('geoquest_email');
      if (savedEmail === email) {
        localStorage.setItem('geoquest_email_verified', 'true');
      }
      
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    await handleSendCode();
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="bg-gradient-to-br from-green-50 to-emerald-50 text-slate-800 border-4 border-green-300 max-w-sm rounded-[2rem] p-8 text-center [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 flex items-center justify-center animate-bounce">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-green-800">All Set!</h2>
            <p className="text-green-700">Your progress is now saved to the cloud!</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="bg-[#fdfbf7] text-slate-800 border-4 border-[#e2d5b5] max-w-sm rounded-[2rem] p-0 overflow-hidden shadow-2xl [&>button]:hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#d4c5a9 2px, transparent 2px)', backgroundSize: '20px 20px' }}>
        </div>

        <div className="relative p-6 text-center z-10">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm text-gray-500"
            data-testid="button-close-reminder"
          >
            <X className="w-4 h-4" />
          </button>

          {step === "PROMPT" ? (
            <>
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-purple-100 border-4 border-blue-200 flex items-center justify-center">
                  <Cloud className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <DialogHeader>
                <DialogTitle className="text-xl font-heading text-slate-800 mb-2">
                  Save Your Progress!
                </DialogTitle>
              </DialogHeader>

              {starsEarned !== undefined && starsEarned > 0 && (
                <div className="flex items-center justify-center gap-2 mb-4 py-2 px-4 bg-yellow-50 border border-yellow-200 rounded-xl inline-flex mx-auto">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />
                  <span className="font-bold text-yellow-700">+{starsEarned} stars earned!</span>
                </div>
              )}

              <p className="text-slate-600 text-sm mb-4">
                Verify your email to save your wins, badges, and progress to the cloud!
              </p>

              {error && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="reminder-email" className="text-xs uppercase font-bold text-slate-500">Your Email</Label>
                  <Input 
                    id="reminder-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-2 border-slate-200 text-center"
                    data-testid="input-reminder-email"
                  />
                </div>

                <Button 
                  className="w-full h-10 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 font-bold rounded-xl"
                  onClick={handleSendCode}
                  disabled={isLoading}
                  data-testid="button-send-reminder-code"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Shield className="w-4 h-4 mr-2" /> Verify & Save</>
                  )}
                </Button>

                <button 
                  onClick={onClose}
                  className="text-slate-400 text-sm hover:text-slate-600"
                  data-testid="button-skip-reminder"
                >
                  Maybe later
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-100 to-green-100 border-4 border-emerald-200 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-emerald-500" />
                </div>
              </div>

              <DialogHeader>
                <DialogTitle className="text-xl font-heading text-slate-800 mb-2">
                  Enter Code
                </DialogTitle>
              </DialogHeader>

              <p className="text-slate-600 text-sm mb-4">
                We sent a code to <strong>{email}</strong>
              </p>

              {error && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <Input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setCode(val);
                  }}
                  className="bg-white border-2 border-slate-200 text-center text-xl tracking-[0.4em] font-bold h-12"
                  data-testid="input-reminder-code"
                />

                <Button 
                  className="w-full h-10 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 font-bold rounded-xl"
                  onClick={handleVerify}
                  disabled={isLoading || code.length !== 6}
                  data-testid="button-verify-reminder-code"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Confirm</>
                  )}
                </Button>

                <div className="text-xs text-slate-500">
                  {resendTimer > 0 ? (
                    <span>Resend in {resendTimer}s</span>
                  ) : (
                    <button 
                      onClick={handleResendCode}
                      className="text-blue-600 hover:text-blue-700 underline"
                      disabled={isLoading}
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useVerificationReminder() {
  const [showReminder, setShowReminder] = useState(false);
  const [reminderData, setReminderData] = useState<{ email?: string; starsEarned?: number }>({});

  const triggerReminder = (data?: { email?: string; starsEarned?: number }) => {
    const email = data?.email || localStorage.getItem('geoquest_email') || '';
    const verified = localStorage.getItem('geoquest_email_verified') === 'true';
    const dismissed = sessionStorage.getItem('verification_reminder_dismissed');
    
    if (!verified && email && !dismissed) {
      const randomChance = Math.random() < 0.3;
      if (randomChance) {
        setReminderData({ email, starsEarned: data?.starsEarned });
        setShowReminder(true);
      }
    }
  };

  const closeReminder = () => {
    setShowReminder(false);
    sessionStorage.setItem('verification_reminder_dismissed', 'true');
  };

  return {
    showReminder,
    reminderData,
    triggerReminder,
    closeReminder,
    ReminderComponent: showReminder ? (
      <VerificationReminder 
        isOpen={showReminder}
        onClose={closeReminder}
        email={reminderData.email}
        starsEarned={reminderData.starsEarned}
      />
    ) : null
  };
}
