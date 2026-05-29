import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Map, Compass, X, Plus, Trash2, ChevronLeft, Mail, Loader2, CheckCircle, MapPin, Camera, Heart, Globe, Star, BookOpen, Eye, EyeOff } from "lucide-react";
import { validateNames } from "@/lib/nameFilter";
import { ALL_PASSPORT_CITIES } from "@/lib/dailyQuestData";

interface SignUpPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: any) => void;
  onContinueWithoutSaving?: () => void;
  variant?: "game" | "travel";
  source?: "gate" | "default";
  message?: string;
}

export function SignUpPrompt({ isOpen, onClose, onLogin, onContinueWithoutSaving, variant = "game", source = "default", message }: SignUpPromptProps) {
  const [mode, setMode] = useState<"MENU" | "EMAIL_SIGNUP" | "EMAIL_FAMILY" | "EMAIL_LOGIN" | "VERIFY_EMAIL" | "FORGOT_PASSWORD" | "RESET_CODE" | "NEW_PASSWORD">("MENU");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [players, setPlayers] = useState<{name: string, age: string}[]>([{ name: "", age: "" }]);
  const [includeParentAsExplorer, setIncludeParentAsExplorer] = useState(true); // Default to including parent
  
  const [verificationCode, setVerificationCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [guestDataLoaded, setGuestDataLoaded] = useState(false);

  const guestProgress = useMemo(() => {
    try {
      const keys = Object.keys(localStorage);
      const collectedKey = keys.find(k => k.startsWith('geoquest_collected_'));
      const collected: string[] = collectedKey ? JSON.parse(localStorage.getItem(collectedKey) || '[]') : [];
      
      let lastCity = "Paris";
      if (collected.length > 0) {
        const lastId = collected[collected.length - 1];
        const cityData = ALL_PASSPORT_CITIES.find(c => c.id === lastId);
        if (cityData) lastCity = cityData.city;
      }

      let totalStars = 0;
      const masteryKey = keys.find(k => k.startsWith('geoquest_mastery_'));
      if (masteryKey) {
        const mastery = JSON.parse(localStorage.getItem(masteryKey) || '[]');
        totalStars = mastery.reduce((sum: number, m: any) => {
          return sum + (m.star1 ? 1 : 0) + (m.star2 ? 1 : 0) + (m.star3 ? 1 : 0) + (m.star4 ? 1 : 0) + (m.star5 ? 1 : 0);
        }, 0);
      }

      const hasPlayedEnough = collected.length > 1 || totalStars > 1;
      return { lastCity, totalStars, citiesDiscovered: collected.length, hasPlayedEnough };
    } catch {
      return { lastCity: "Paris", totalStars: 1, citiesDiscovered: 1, hasPlayedEnough: false };
    }
  }, [isOpen]);

  // Reset all form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setMode("MENU");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPlayers([{ name: "", age: "" }]);
      setIncludeParentAsExplorer(true);
      setVerificationCode("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError("");
      setSuccessMessage("");
      setGuestDataLoaded(false);
    }
  }, [isOpen]);

  // Auto-populate from guest session data when switching to signup mode
  useEffect(() => {
    if (mode === "EMAIL_SIGNUP" && !guestDataLoaded) {
      try {
        const savedSession = localStorage.getItem('geoquest_guest_session');
        console.log('[SignUpPrompt] Loading guest session for autofill:', savedSession);
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          // Only use data from the last 24 hours
          if (sessionData.timestamp && Date.now() - sessionData.timestamp < 24 * 60 * 60 * 1000) {
            console.log('[SignUpPrompt] Guest session valid, autofilling:', sessionData);
            // Always set if we have data (overwrite empty defaults)
            if (sessionData.parentName) {
              setName(sessionData.parentName);
            }
            if (sessionData.parentEmail) {
              setEmail(sessionData.parentEmail);
            }
            if (sessionData.playerNames && sessionData.playerNames.length > 0) {
              // Strip all game prefixes from names
              const prefixRegex = /^(Explorer |Traveler |Adventurer |Voyager |Navigator |Scout |Ranger |Captain )/;
              const prefillPlayers = sessionData.playerNames.map((n: string) => ({
                name: n.replace(prefixRegex, '').trim(),
                age: ""
              }));
              console.log('[SignUpPrompt] Autofilling players:', prefillPlayers);
              if (prefillPlayers.length > 0) {
                setPlayers(prefillPlayers);
              }
            }
            setGuestDataLoaded(true);
          } else {
            console.log('[SignUpPrompt] Guest session expired');
          }
        } else {
          console.log('[SignUpPrompt] No guest session found');
        }
      } catch (e) {
        console.error('Error loading guest session:', e);
      }
    }
  }, [mode, guestDataLoaded]);

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([...players, { name: "", age: "" }]);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      const newPlayers = [...players];
      newPlayers.splice(index, 1);
      setPlayers(newPlayers);
    }
  };

  const updatePlayer = (index: number, field: 'name' | 'age', value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

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

  const handleStep1Continue = () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Fill in all required fields");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters for your password");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setError("");
    setMode("EMAIL_FAMILY");
  };

  const handleSubmit = async (skipKids = false) => {
    const activePlayers = skipKids ? [] : players.filter(p => p.name.trim() && p.age.trim());

    const nameValidation = validateNames(name, activePlayers.map(p => p.name));
    if (!nameValidation.valid) {
      setError(nameValidation.message || "Please choose different names");
      return;
    }

    // Check if offline before attempting signup
    if (!navigator.onLine) {
      setError("You're offline. Check your connection and try again.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Get guest rewards from session data to migrate to new explorers
      let guestRewards: any[] = [];
      try {
        const savedSession = localStorage.getItem('geoquest_guest_session');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          guestRewards = sessionData.playerRewards || [];
          console.log('[SignUpPrompt] Guest rewards to migrate:', guestRewards);
        }
      } catch (e) {
        console.error('Error loading guest rewards:', e);
      }
      
      // Build explorers list - include parent as adult explorer if checkbox is checked
      const allExplorers = [...activePlayers.map(p => ({ name: p.name, age: p.age, profileType: 'kid' }))];
      
      if (includeParentAsExplorer) {
        // Extract first name from full name for the explorer
        const parentFirstName = name.split(' ')[0] || name;
        allExplorers.push({ name: parentFirstName, age: 'adult', profileType: 'adult' });
      }
      
      const registerRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          players: allExplorers,
          guestRewards: guestRewards,
          locale: navigator.language || 'en-US',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          signupSource: variant === 'travel' ? 'geoadventures' : 'geogames',
        })
      });
      
      if (!registerRes.ok) {
        const data = await registerRes.json();
        if (data.errors) {
          throw new Error(data.errors);
        }
        throw new Error(data.message || "Registration failed");
      }
      
      // Skip email verification - auto-login after successful registration
      // Verification is only needed for forgot password flow
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const loginData = await loginRes.json();
      
      if (!loginRes.ok) {
        throw new Error(loginData.message || "Account created but login failed. Please try logging in.");
      }
      
      // Auto-login successful - no verification needed
      onLogin({
        method: 'email',
        name: loginData.user.name,
        email: loginData.user.email,
        userId: loginData.user.id,
        players: loginData.players,
        verified: true // Consider verified since they just registered with password
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send code");
      }
      
      startResendTimer();
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch('/api/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Verification failed");
      }
      
      onLogin({
        method: 'email',
        name: data.user?.name || name,
        email: data.user?.email || email,
        userId: data.user?.id,
        players: data.players || players,
        verified: true
      });
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToForm = () => {
    setMode("EMAIL_SIGNUP");
    setVerificationCode("");
    setError("");
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }
    
    // Check if offline before attempting login
    if (!navigator.onLine) {
      setError("You're offline. Please connect to the internet to log in.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      
      onLogin({
        method: 'email',
        name: data.user.name,
        email: data.user.email,
        userId: data.user.id,
        players: data.players,
        verified: data.user.emailVerified
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    
    if (!navigator.onLine) {
      setError("You're offline. Please connect to the internet to reset your password.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to send reset code");
      }
      
      startResendTimer();
      setMode("RESET_CODE");
      setSuccessMessage("Check your email for the reset code");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to resend code");
      }
      
      startResendTimer();
      setSuccessMessage("A new code has been sent to your email");
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!resetCode || resetCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode })
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid code");
      }
      
      setMode("NEW_PASSWORD");
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword })
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reset password");
      }
      
      setSuccessMessage("Password reset successfully! You can now log in.");
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setResetCode("");
      setMode("EMAIL_LOGIN");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#fdfbf7] text-slate-800 border-4 border-[#e2d5b5] max-w-md rounded-[2rem] p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col [&>button]:hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#d4c5a9 2px, transparent 2px)', backgroundSize: '20px 20px' }}>
        </div>

        <div className="relative p-8 pt-14 flex flex-col items-center text-center z-10 flex-1 overflow-y-auto custom-scrollbar">
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm text-gray-500 z-20"
            data-testid="button-close-signup"
          >
            <X className="w-5 h-5" />
          </button>

          {(mode === "EMAIL_SIGNUP" || mode === "EMAIL_FAMILY" || mode === "EMAIL_LOGIN" || mode === "VERIFY_EMAIL" || mode === "FORGOT_PASSWORD" || mode === "RESET_CODE" || mode === "NEW_PASSWORD") && (
            <button 
              onClick={() => {
                setError("");
                setSuccessMessage("");
                if (mode === "EMAIL_FAMILY") {
                  setMode("EMAIL_SIGNUP");
                } else if (mode === "VERIFY_EMAIL") {
                  setMode("EMAIL_SIGNUP");
                  setVerificationCode("");
                } else if (mode === "FORGOT_PASSWORD") {
                  setMode("EMAIL_LOGIN");
                } else if (mode === "RESET_CODE") {
                  setMode("FORGOT_PASSWORD");
                  setResetCode("");
                } else if (mode === "NEW_PASSWORD") {
                  setMode("RESET_CODE");
                  setNewPassword("");
                  setConfirmNewPassword("");
                } else {
                  setMode("MENU");
                }
              }}
              className="absolute top-4 left-4 p-2 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 shadow-sm text-gray-500 z-20"
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {variant === "travel" && mode === "MENU" ? (
            <div className="mb-3 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium tracking-wide uppercase text-amber-700">
              Free account
            </div>
          ) : null}
          
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading text-slate-800 mb-2 text-center leading-tight drop-shadow-sm">
              {mode === "MENU" && variant === "travel" ? (
                <>Save this adventure</>
              ) : mode === "MENU" ? (
                <>{(source === "gate" || guestProgress.hasPlayedEnough) ? "Save" : "Start"} Your <span className="text-blue-600">Explorer Journey</span></>
              ) : mode === "EMAIL_SIGNUP" ? (
                <>Create your account</>
              ) : mode === "EMAIL_FAMILY" ? (
                <>Add your family</>
              ) : mode === "EMAIL_LOGIN" ? (
                <>Welcome <span className="text-blue-600">Back!</span></>
              ) : mode === "FORGOT_PASSWORD" ? (
                <>Forgot <span className="text-amber-600">Password?</span></>
              ) : mode === "RESET_CODE" ? (
                <>Enter <span className="text-amber-600">Code</span></>
              ) : mode === "NEW_PASSWORD" ? (
                <>New <span className="text-green-600">Password</span></>
              ) : (
                <>Check Your <span className="text-emerald-600">Email</span></>
              )}
            </DialogTitle>
          </DialogHeader>

          {message && mode === "MENU" && (
            <div className="w-full mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 text-sm text-center">
              {message}
            </div>
          )}

          {successMessage && (
            <div className="w-full mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {mode === "MENU" && variant === "travel" ? (
            <>
              <p className="text-slate-600 text-sm mb-5 font-medium max-w-xs text-center">
                Pick up where you left off and keep your child's memories in one place.
              </p>

              <div className="w-full space-y-2 mb-5">
                {[
                  { icon: <MapPin className="w-3.5 h-3.5 text-amber-600" />, label: "Save your trip plan" },
                  { icon: <Camera className="w-3.5 h-3.5 text-amber-600" />, label: "Keep photos and moments" },
                  { icon: <Heart className="w-3.5 h-3.5 text-amber-600" />, label: "Come back anytime" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <p className="text-sm text-slate-700">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="w-full space-y-2">
                <Button
                  className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all hover:-translate-y-0.5"
                  onClick={() => setMode("EMAIL_SIGNUP")}
                  data-testid="button-email-signup"
                >
                  Save my adventure
                </Button>

                {onContinueWithoutSaving && (
                  <button
                    onClick={() => { onClose(); onContinueWithoutSaving(); }}
                    className="w-full h-10 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                    data-testid="button-continue-without-saving"
                  >
                    Continue without saving
                  </button>
                )}
              </div>

              <p className="mt-4 text-xs text-slate-400 text-center">
                Built for families. Your data stays private.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-200 w-full text-center">
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("EMAIL_LOGIN")}
                    className="text-amber-600 font-bold hover:underline"
                    data-testid="button-login"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </>
          ) : mode === "MENU" ? (
            <>
              {(source === "gate" || guestProgress.hasPlayedEnough) && (
                <div className="w-full mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left" data-testid="progress-summary">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Explorer Progress Started
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-700 font-medium">
                      🌍 {guestProgress.lastCity} discovered
                    </p>
                    <p className="text-sm text-slate-700 font-medium">
                      ⭐ {guestProgress.totalStars || 1} {guestProgress.totalStars === 1 ? 'star' : 'stars'} earned
                    </p>
                  </div>
                </div>
              )}

              <p className="text-slate-600 text-sm mb-6 font-medium max-w-xs">
                Create your free explorer profile to save your discoveries and continue exploring the world.
              </p>

              <div className="w-full grid gap-3 mb-6">
                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border-2 border-blue-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-200">
                    <Trophy className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-sm text-slate-800">Save Your Discoveries</h4>
                    <p className="text-xs text-slate-500 font-medium">Keep your cities, passport stamps, and learning progress.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border-2 border-emerald-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-200">
                    <Compass className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-sm text-slate-800">Continue Your City Journeys</h4>
                    <p className="text-xs text-slate-500 font-medium">Discover new places and keep exploring the world.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border-2 border-purple-100 shadow-sm">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-200">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-sm text-slate-800">Build Your Explorer Passport</h4>
                    <p className="text-xs text-slate-500 font-medium">Track the cities you discover and master.</p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-3">
                <Button 
                  className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-md transition-all hover:-translate-y-0.5"
                  onClick={() => setMode("EMAIL_SIGNUP")}
                  data-testid="button-email-signup"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  {(source === "gate" || guestProgress.hasPlayedEnough) ? "Save Your Progress" : "Create Free Explorer Profile"}
                </Button>
              </div>

              <p className="mt-4 text-xs text-slate-500 text-center">
                Parents — your child's data stays private and secure.
              </p>

              <p className="mt-2 text-[10px] text-slate-400 max-w-xs leading-tight">
                By joining, you agree to our <a href="/terms" className="text-blue-500 underline hover:text-blue-600">Terms of Service</a> and <a href="/privacy" className="text-blue-500 underline hover:text-blue-600">Privacy Policy</a>.
              </p>
              
              <div className="mt-4 pt-4 border-t border-slate-200 w-full">
                <p className="text-sm text-slate-500 mb-2">Already have an account?</p>
                <Button 
                  variant="outline"
                  className="w-full h-10 rounded-xl border-2 border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-sm"
                  onClick={() => setMode("EMAIL_LOGIN")}
                  data-testid="button-login"
                >
                  Log In
                </Button>
              </div>
            </>
          ) : mode === "EMAIL_LOGIN" ? (
            <div className="w-full space-y-4 text-left">
              <p className="text-slate-600 text-sm text-center mb-4">
                Log in to continue your adventure
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-xs uppercase font-bold text-slate-500">Email</Label>
                <Input 
                  id="login-email" 
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-2 border-slate-200 focus-visible:ring-blue-500"
                  data-testid="input-login-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-xs uppercase font-bold text-slate-500">Password</Label>
                <Input 
                  id="login-password" 
                  type="password" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-2 border-slate-200 focus-visible:ring-blue-500"
                  data-testid="input-login-password"
                />
                <div className="text-right">
                  <button 
                    onClick={() => { setMode("FORGOT_PASSWORD"); setError(""); setSuccessMessage(""); }}
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="button"
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg rounded-xl"
                  onClick={handleLogin}
                  disabled={isLoading}
                  data-testid="button-submit-login"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Logging in...</>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-sm text-slate-500">
                  Don't have an account?{" "}
                  <button 
                    onClick={() => { setMode("EMAIL_SIGNUP"); setError(""); }}
                    className="text-green-600 font-bold hover:underline"
                    data-testid="link-signup"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </div>
          ) : mode === "EMAIL_SIGNUP" ? (
            <div className="w-full space-y-4 text-left">
               <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs uppercase font-bold text-slate-500">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border-2 border-slate-200 focus-visible:ring-blue-500"
                    data-testid="input-parent-name"
                  />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs uppercase font-bold text-slate-500">Email</Label>
                  <Input
                    id="email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-2 border-slate-200 focus-visible:ring-blue-500"
                    data-testid="input-parent-email"
                  />
               </div>

               <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs uppercase font-bold text-slate-500">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white border-2 border-slate-200 focus-visible:ring-blue-500 pr-10"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs uppercase font-bold text-slate-500">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-white border-2 border-slate-200 focus-visible:ring-blue-500 pr-10"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
               </div>

               <div className="pt-4">
                 <Button
                    type="button"
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg rounded-xl"
                    onClick={handleStep1Continue}
                    data-testid="button-step1-continue"
                 >
                    Continue
                 </Button>
               </div>

               <div className="text-center pt-2">
                 <p className="text-sm text-slate-500">
                   Already have an account?{" "}
                   <button
                     onClick={() => { setMode("EMAIL_LOGIN"); setError(""); }}
                     className="text-blue-600 font-bold hover:underline"
                     data-testid="link-login-from-signup"
                   >
                     Log in
                   </button>
                 </p>
               </div>
            </div>
          ) : mode === "EMAIL_FAMILY" ? (
            <div className="w-full space-y-4 text-left">
               <p className="text-slate-500 text-sm text-center">
                 Helps us personalise your trip. You can add more later from settings.
               </p>

               <div className="pt-1 border-t border-slate-100">
                  <label className="flex items-center gap-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeParentAsExplorer}
                      onChange={(e) => setIncludeParentAsExplorer(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-blue-300 text-blue-600 focus:ring-blue-500"
                      data-testid="checkbox-include-parent"
                    />
                    <div>
                      <span className="font-medium text-slate-700">Include me as an explorer</span>
                      <p className="text-xs text-slate-500">I want to play and track my own progress</p>
                    </div>
                  </label>
               </div>

               <div>
                  <div className="flex items-center justify-between mb-3">
                     <Label className="text-xs uppercase font-bold text-slate-500">Kids (optional)</Label>
                     <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addPlayer}
                        className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 text-xs"
                        disabled={players.length >= 4}
                        data-testid="button-add-kid"
                     >
                        <Plus className="w-3 h-3 mr-1" /> Add another child
                     </Button>
                  </div>

                  <div className="space-y-3">
                    {players.map((player, idx) => (
                      <div key={idx} className="flex gap-2 items-start animate-in fade-in slide-in-from-bottom-2">
                         <div className="flex-1">
                            <Input
                              placeholder={`Child ${idx + 1} name`}
                              value={player.name}
                              onChange={(e) => updatePlayer(idx, 'name', e.target.value)}
                              className="bg-white border-2 border-slate-200 h-10"
                              data-testid={`input-kid-name-${idx}`}
                            />
                         </div>
                         <div className="w-20">
                            <Input
                              placeholder="Age"
                              inputMode="numeric"
                              value={player.age}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                                updatePlayer(idx, 'age', val);
                              }}
                              className="bg-white border-2 border-slate-200 h-10"
                              data-testid={`input-kid-age-${idx}`}
                            />
                         </div>
                         {players.length > 1 && (
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removePlayer(idx)}
                              className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50"
                              data-testid={`button-remove-kid-${idx}`}
                           >
                              <Trash2 className="w-4 h-4" />
                           </Button>
                         )}
                      </div>
                    ))}
                  </div>
               </div>

               <div className="pt-2 space-y-2">
                 <Button
                    type="button"
                    className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg rounded-xl"
                    onClick={() => handleSubmit(false)}
                    disabled={isLoading}
                    data-testid="button-submit-signup"
                 >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating account...</>
                    ) : (
                      "Continue"
                    )}
                 </Button>

                 <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-10 text-sm font-medium text-slate-400 hover:text-slate-600"
                    onClick={() => handleSubmit(true)}
                    disabled={isLoading}
                    data-testid="button-skip-kids"
                 >
                    Skip for now →
                 </Button>
                 <p className="text-center text-xs text-slate-400">You can edit this anytime</p>
               </div>
            </div>
          ) : mode === "FORGOT_PASSWORD" ? (
            <div className="w-full space-y-4 text-left">
              <p className="text-slate-600 text-sm text-center mb-4">
                Enter your email address and we'll send you a code to reset your password.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-xs uppercase font-bold text-slate-500">Email</Label>
                <Input 
                  id="forgot-email" 
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-2 border-slate-200 focus-visible:ring-amber-500"
                  data-testid="input-forgot-email"
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="button"
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg rounded-xl"
                  onClick={handleForgotPassword}
                  disabled={isLoading || !email}
                  data-testid="button-send-reset-code"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    "Send Reset Code"
                  )}
                </Button>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-sm text-slate-500">
                  Remember your password?{" "}
                  <button 
                    onClick={() => { setMode("EMAIL_LOGIN"); setError(""); setSuccessMessage(""); }}
                    className="text-blue-600 font-bold hover:underline"
                    data-testid="link-back-to-login"
                  >
                    Log In
                  </button>
                </p>
              </div>
            </div>
          ) : mode === "RESET_CODE" ? (
            <div className="w-full space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center">
                <Mail className="w-10 h-10 text-amber-500" />
              </div>
              
              <div>
                <p className="text-slate-600 text-sm mb-2">
                  We sent a 6-digit code to
                </p>
                <p className="font-bold text-slate-800">{email}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reset-code" className="text-xs uppercase font-bold text-slate-500">Enter Code</Label>
                <Input 
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setResetCode(val);
                  }}
                  className="bg-white border-2 border-slate-200 focus-visible:ring-amber-500 text-center text-2xl tracking-[0.5em] font-bold h-14"
                  data-testid="input-reset-code"
                />
              </div>
              
              <Button 
                type="button"
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg rounded-xl"
                onClick={handleVerifyResetCode}
                disabled={isLoading || resetCode.length !== 6}
                data-testid="button-verify-reset-code"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</>
                ) : (
                  "Verify Code"
                )}
              </Button>
              
              <div className="text-sm text-slate-500">
                Didn't get the code?{" "}
                {resendTimer > 0 ? (
                  <span className="text-slate-400">Resend in {resendTimer}s</span>
                ) : (
                  <button 
                    onClick={handleResendResetCode}
                    className="text-amber-600 hover:text-amber-700 font-medium underline"
                    disabled={isLoading}
                    data-testid="button-resend-reset-code"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          ) : mode === "NEW_PASSWORD" ? (
            <div className="w-full space-y-4 text-left">
              <p className="text-slate-600 text-sm text-center mb-4">
                Create a new password for your account.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs uppercase font-bold text-slate-500">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  placeholder="At least 8 characters" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white border-2 border-slate-200 focus-visible:ring-green-500"
                  autoComplete="new-password"
                  minLength={8}
                  data-testid="input-new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-xs uppercase font-bold text-slate-500">Confirm New Password</Label>
                <Input 
                  id="confirm-new-password" 
                  type="password" 
                  placeholder="Re-enter your new password" 
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="bg-white border-2 border-slate-200 focus-visible:ring-green-500"
                  autoComplete="new-password"
                  minLength={8}
                  data-testid="input-confirm-new-password"
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="button"
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg rounded-xl"
                  onClick={handleResetPassword}
                  disabled={isLoading || !newPassword || !confirmNewPassword}
                  data-testid="button-reset-password"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Resetting...</>
                  ) : (
                    <><CheckCircle className="w-5 h-5 mr-2" /> Reset Password</>
                  )}
                </Button>
              </div>
            </div>
          ) : mode === "VERIFY_EMAIL" ? (
            <div className="w-full space-y-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
                <Mail className="w-10 h-10 text-emerald-500" />
              </div>
              
              <div>
                <p className="text-slate-600 text-sm mb-2">
                  We sent a 6-digit code to
                </p>
                <p className="font-bold text-slate-800">{email}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs uppercase font-bold text-slate-500">Enter Code</Label>
                <Input 
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setVerificationCode(val);
                  }}
                  className="bg-white border-2 border-slate-200 focus-visible:ring-emerald-500 text-center text-2xl tracking-[0.5em] font-bold h-14"
                  data-testid="input-verification-code"
                />
              </div>
              
              <Button 
                type="button"
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg rounded-xl"
                onClick={handleVerifyCode}
                disabled={isLoading || verificationCode.length !== 6}
                data-testid="button-verify-code"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</>
                ) : (
                  <><CheckCircle className="w-5 h-5 mr-2" /> Verify & Join</>
                )}
              </Button>
              
              <div className="text-sm text-slate-500">
                Didn't get the code?{" "}
                {resendTimer > 0 ? (
                  <span className="text-slate-400">Resend in {resendTimer}s</span>
                ) : (
                  <button 
                    onClick={handleResendCode}
                    className="text-emerald-600 hover:text-emerald-700 font-medium underline"
                    disabled={isLoading}
                    data-testid="button-resend-code"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>
          ) : null}

        </div>
      </DialogContent>
    </Dialog>
  );
}
