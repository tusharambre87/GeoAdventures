import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  MessageSquare, 
  Star, 
  Clock, 
  Globe, 
  Plane, 
  Smartphone, 
  Lightbulb,
  Gamepad2,
  Map,
  Trophy,
  Compass,
  BookOpen,
  Bell,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useUser } from "@/lib/userContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

type ModalStep = "entry" | "review_confirm" | "area_select" | "subarea_select" | "feedback_text" | "thank_you" | "negative_review_prompt";
type FeedbackArea = "geogames" | "geoadventures" | "app_overall" | "idea";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: () => void;
  startMode?: "review" | "feedback";
}

const GEOGAMES_SUBAREAS = [
  { id: "guess_and_go", label: "Guess & Go", icon: Gamepad2 },
  { id: "daily_quest", label: "Daily Quest", icon: Map },
  { id: "treasure_vault", label: "Treasure Vault", icon: Trophy },
  { id: "crossworld", label: "CrossWorld", icon: Globe },
  { id: "passports", label: "Passports / Progress", icon: BookOpen },
  { id: "other", label: "Something else", icon: MessageSquare },
];

const GEOADVENTURES_SUBAREAS = [
  { id: "trips", label: "Trips overall", icon: Plane },
  { id: "journey_packs", label: "Journey Packs", icon: Compass },
  { id: "stops", label: "Exploration Places (Stops)", icon: Map },
  { id: "video_collage", label: "Video/Collage", icon: Plane },
  { id: "memories", label: "Family Lore / Memories", icon: BookOpen },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "other", label: "Something else", icon: MessageSquare },
];

export function FeedbackModal({ isOpen, onClose, onDismiss, startMode }: FeedbackModalProps) {
  const { user } = useUser();
  const [, navigate] = useLocation();
  
  const [step, setStep] = useState<ModalStep>("entry");
  const [feedbackArea, setFeedbackArea] = useState<FeedbackArea | null>(null);
  const [feedbackSubarea, setFeedbackSubarea] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reviewParentName, setReviewParentName] = useState("");
  const [reviewChildAges, setReviewChildAges] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewModeTag, setReviewModeTag] = useState<"geogames" | "geoadventures" | "both">("geogames");
  const [reviewRating, setReviewRating] = useState(5);
  const [wasReviewSubmission, setWasReviewSubmission] = useState(false);
  const [wasNegativeReview, setWasNegativeReview] = useState(false);

  useEffect(() => {
    if (isOpen && startMode) {
      if (startMode === "review") {
        setStep("review_confirm");
      } else if (startMode === "feedback") {
        setStep("area_select");
      }
    }
  }, [isOpen, startMode]);

  const resetState = useCallback(() => {
    setStep("entry");
    setFeedbackArea(null);
    setFeedbackSubarea(null);
    setFeedbackText("");
    setFeedbackEmail(user?.email || "");
    setReviewParentName("");
    setReviewChildAges("");
    setReviewText("");
    setReviewModeTag("geogames");
    setReviewRating(5);
    setWasReviewSubmission(false);
    setWasNegativeReview(false);
  }, [user?.email]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleDismiss = useCallback(() => {
    resetState();
    onDismiss();
  }, [resetState, onDismiss]);

  const handleShareFeedback = () => {
    setStep("area_select");
  };

  const handleLeaveReview = () => {
    setStep("review_confirm");
  };

  const handleAreaSelect = (area: FeedbackArea) => {
    setFeedbackArea(area);
    if (area === "app_overall" || area === "idea") {
      setStep("feedback_text");
    } else {
      setStep("subarea_select");
    }
  };

  const handleSubareaSelect = (subarea: string) => {
    setFeedbackSubarea(subarea);
    setStep("feedback_text");
  };

  const handleBack = () => {
    if (step === "subarea_select") {
      setStep("area_select");
      setFeedbackSubarea(null);
    } else if (step === "feedback_text") {
      if (feedbackArea === "app_overall" || feedbackArea === "idea") {
        setStep("area_select");
      } else {
        setStep("subarea_select");
      }
    } else if (step === "area_select" || step === "review_confirm") {
      setStep("entry");
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackArea) return;
    
    if (!feedbackEmail || !feedbackEmail.includes('@')) {
      toast.error("Please enter a valid email address.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackArea,
          feedbackSubarea,
          feedbackText,
          userId: user?.id || null,
          userEmail: feedbackEmail || null,
        }),
      });

      if (response.ok) {
        setStep("thank_you");
      } else {
        toast.error("Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewParentName || !reviewText) {
      toast.error("Please enter your name and review.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName: reviewParentName,
          childAges: reviewChildAges,
          rating: reviewRating,
          reviewText,
          modeTag: reviewModeTag,
          userId: user?.id || null,
        }),
      });

      if (response.ok) {
        setWasReviewSubmission(true);
        
        // For low ratings (1-3), show a prompt asking if they want to share feedback
        if (reviewRating <= 3) {
          setWasNegativeReview(true);
          setStep("negative_review_prompt");
        } else {
          setStep("thank_you");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Review submission failed:", response.status, errorData);
        toast.error("Failed to submit review. Please try again.");
      }
    } catch (error) {
      console.error("Review submission error:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleNegativeReviewFeedback = () => {
    // Pre-populate feedback area and go to feedback flow
    setFeedbackArea("app_overall");
    setStep("feedback_text");
  };
  
  const handleNegativeReviewNoThanks = () => {
    setStep("thank_you");
  };

  const handleGoToReviewsPage = () => {
    handleClose();
    navigate("/reviews");
  };

  const renderStars = () => (
    <div className="flex gap-1 justify-center" data-testid="review-rating-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setReviewRating(star)}
          className="p-1 transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              star <= reviewRating
                ? "text-amber-400 fill-amber-400"
                : "text-slate-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {step === "entry" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl" data-testid="text-feedback-title">
                Help us make GeoQuest better for your family
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
                We're building GeoQuest with parents.
                If you have a moment, we'd love your thoughts.
              </p>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleShareFeedback} 
                  className="w-full gap-2 h-12"
                  data-testid="button-share-feedback"
                >
                  <MessageSquare className="w-5 h-5" />
                  Share feedback
                </Button>
                
                <Button 
                  onClick={handleLeaveReview}
                  variant="outline" 
                  className="w-full gap-2 h-12"
                  data-testid="button-leave-review"
                >
                  <Star className="w-5 h-5" />
                  Leave a review
                </Button>
                
                <Button 
                  onClick={handleDismiss}
                  variant="ghost" 
                  className="w-full text-slate-500 gap-2 h-10"
                  data-testid="button-maybe-later"
                >
                  <Clock className="w-4 h-4" />
                  Maybe later
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "review_confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl" data-testid="text-review-confirm-title">
                Enjoying GeoQuest?
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-slate-600 dark:text-slate-300 mb-6">
                If GeoQuest has been helpful for your family, a quick review helps other parents discover it.
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <Label htmlFor="review-name">Your first name</Label>
                  <Input
                    id="review-name"
                    value={reviewParentName}
                    onChange={(e) => setReviewParentName(e.target.value)}
                    placeholder="Sarah"
                    className="mt-1.5"
                    data-testid="input-review-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="review-ages">Your child's age(s)</Label>
                  <Input
                    id="review-ages"
                    value={reviewChildAges}
                    onChange={(e) => setReviewChildAges(e.target.value)}
                    placeholder="e.g., 7-year-old, or 5 & 9"
                    className="mt-1.5"
                    data-testid="input-review-ages"
                  />
                </div>

                <div>
                  <Label>Which mode do you use most?</Label>
                  <RadioGroup
                    value={reviewModeTag}
                    onValueChange={(v) => setReviewModeTag(v as typeof reviewModeTag)}
                    className="flex gap-4 mt-1.5"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="geogames" id="mode-geogames" />
                      <Label htmlFor="mode-geogames" className="flex items-center gap-1.5 cursor-pointer">
                        <Gamepad2 className="w-4 h-4" /> GeoGames
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="geoadventures" id="mode-geoadventures" />
                      <Label htmlFor="mode-geoadventures" className="flex items-center gap-1.5 cursor-pointer">
                        <Plane className="w-4 h-4" /> GeoAdventures
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="mode-both" />
                      <Label htmlFor="mode-both" className="cursor-pointer">Both</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div>
                  <Label>How would you rate GeoQuest?</Label>
                  <div className="mt-2">
                    {renderStars()}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="review-text">Your review</Label>
                  <Textarea
                    id="review-text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="What do you like about GeoQuest? How has it helped your family?"
                    className="mt-1.5 min-h-[100px]"
                    data-testid="textarea-review"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || !reviewParentName || !reviewText}
                  className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                  data-testid="button-submit-review"
                >
                  <Star className="w-4 h-4" />
                  {isSubmitting ? "Submitting..." : "Submit review"}
                </Button>
                <Button 
                  onClick={handleBack}
                  variant="ghost" 
                  className="w-full text-slate-500"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "area_select" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl" data-testid="text-area-title">
                What would you like to share feedback about?
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <button
                onClick={() => handleAreaSelect("geogames")}
                className="w-full p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center gap-3"
                data-testid="button-area-geogames"
              >
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-violet-600" />
                </div>
                <span className="font-medium text-slate-800 dark:text-white">GeoGames</span>
              </button>
              
              <button
                onClick={() => handleAreaSelect("geoadventures")}
                className="w-full p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors flex items-center gap-3"
                data-testid="button-area-geoadventures"
              >
                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-teal-600" />
                </div>
                <span className="font-medium text-slate-800 dark:text-white">GeoAdventures</span>
              </button>
              
              <button
                onClick={() => handleAreaSelect("app_overall")}
                className="w-full p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors flex items-center gap-3"
                data-testid="button-area-app"
              >
                <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-sky-600" />
                </div>
                <span className="font-medium text-slate-800 dark:text-white">The app overall</span>
              </button>
              
              <button
                onClick={() => handleAreaSelect("idea")}
                className="w-full p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-3"
                data-testid="button-area-idea"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                </div>
                <span className="font-medium text-slate-800 dark:text-white">An idea or suggestion</span>
              </button>

              <Button 
                onClick={handleBack}
                variant="ghost" 
                className="w-full text-slate-500 mt-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </>
        )}

        {step === "subarea_select" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl" data-testid="text-subarea-title">
                Which part of {feedbackArea === "geogames" ? "GeoGames" : "GeoAdventures"} are you thinking about?
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-2">
              {(feedbackArea === "geogames" ? GEOGAMES_SUBAREAS : GEOADVENTURES_SUBAREAS).map((subarea) => {
                const Icon = subarea.icon;
                return (
                  <button
                    key={subarea.id}
                    onClick={() => handleSubareaSelect(subarea.id)}
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center gap-3"
                    data-testid={`button-subarea-${subarea.id}`}
                  >
                    <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <span className="text-slate-800 dark:text-white">{subarea.label}</span>
                  </button>
                );
              })}

              <Button 
                onClick={handleBack}
                variant="ghost" 
                className="w-full text-slate-500 mt-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </>
        )}

        {step === "feedback_text" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl" data-testid="text-feedback-input-title">
                Tell us more (optional but helpful)
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What worked well?
What felt confusing?
What would you like to see improved?"
                className="min-h-[150px] mb-4"
                data-testid="textarea-feedback"
              />
              
              <div className="mb-4">
                <Label htmlFor="feedback-email" className="text-sm text-slate-600 dark:text-slate-400">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="feedback-email"
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder={user ? "" : "your.email@example.com"}
                  disabled={!!user?.email}
                  required
                  className="mt-1"
                  data-testid="input-feedback-email"
                />
                {user?.email && (
                  <p className="text-xs text-slate-400 mt-1">Using your account email</p>
                )}
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <Button 
                  onClick={handleSubmitFeedback}
                  disabled={isSubmitting}
                  className="w-full gap-2"
                  data-testid="button-submit-feedback"
                >
                  {isSubmitting ? "Submitting..." : "Submit feedback"}
                </Button>
                <Button 
                  onClick={handleBack}
                  variant="ghost" 
                  className="w-full text-slate-500"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "negative_review_prompt" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl" data-testid="text-negative-review-title">
                We're sorry to hear that 😔
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Your feedback has been recorded.
              </p>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Would you mind taking a moment to tell us how we can improve?
              </p>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleNegativeReviewFeedback}
                  className="w-full gap-2"
                  data-testid="button-share-feedback-after-review"
                >
                  <MessageSquare className="w-5 h-5" />
                  Share feedback to help us improve
                </Button>
                <Button 
                  onClick={handleNegativeReviewNoThanks}
                  variant="ghost" 
                  className="w-full text-slate-500"
                  data-testid="button-no-thanks"
                >
                  No thank you
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "thank_you" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl" data-testid="text-thank-you-title">
                {wasReviewSubmission 
                  ? "Thank you for your review! ⭐" 
                  : "Thank you for helping us improve GeoQuest 🌍"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              {wasReviewSubmission ? (
                wasNegativeReview ? (
                  <>
                    <p className="text-slate-600 dark:text-slate-300 mb-2">
                      We've noted your feedback.
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                      Thank you for taking the time to share your thoughts with us.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-600 dark:text-slate-300 mb-2">
                      Your review will be posted on this page soon.
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                      Thank you for helping other families discover GeoQuest.
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="text-slate-600 dark:text-slate-300 mb-2">
                    We read every message.
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mb-6">
                    Your feedback helps shape what we build next.
                  </p>
                </>
              )}
              
              <Button 
                onClick={handleClose}
                className="w-full"
                data-testid="button-done"
              >
                Done
              </Button>
              
              {!wasReviewSubmission && (
                <p className="text-xs text-slate-400 mt-4">
                  We may follow up if we need clarification — but only if you're okay with it.
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
