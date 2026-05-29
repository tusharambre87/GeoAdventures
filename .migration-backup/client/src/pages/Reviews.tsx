import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, MessageSquarePlus, Plane, Globe, Gamepad2 } from "lucide-react";
import { Link } from "wouter";
import { FeedbackModal } from "@/components/FeedbackModal";
import { useQuery } from "@tanstack/react-query";
import { useParentalGate } from "@/components/ParentalGate";

type ModeFilter = "all" | "geogames" | "geoadventures";

interface ReviewData {
  id: string;
  parentName: string;
  childAges: string;
  rating: number;
  reviewText: string;
  modeTag: "geogames" | "geoadventures" | "both";
  createdAt?: string;
}

interface DbReview {
  id: number;
  parentName: string;
  childAges: string | null;
  rating: number;
  reviewText: string;
  modeTag: "geogames" | "geoadventures" | "both";
  createdAt: string;
}

const sampleReviews: ReviewData[] = [
  {
    id: "1",
    parentName: "Megan",
    childAges: "6-year-old",
    rating: 5,
    reviewText: "GeoQuest is one of the few apps I don't have to supervise constantly. My daughter plays Guess & Go and then tells us facts at dinner.",
    modeTag: "geogames",
  },
  {
    id: "2",
    parentName: "Daniel",
    childAges: "8-year-old",
    rating: 5,
    reviewText: "My son struggles with attention, but the games are short and calm. No loud animations, no pressure — just thinking.",
    modeTag: "geogames",
  },
  {
    id: "3",
    parentName: "Ayesha",
    childAges: "9-year-old",
    rating: 5,
    reviewText: "I love that it doesn't feel competitive. There's no stress, just curiosity.",
    modeTag: "geogames",
  },
  {
    id: "4",
    parentName: "Laura",
    childAges: "5 & 9",
    rating: 5,
    reviewText: "We used GeoQuest on a road trip, and it completely changed the mood. The kids were curious before we arrived instead of bored.",
    modeTag: "geoadventures",
  },
  {
    id: "5",
    parentName: "Chris",
    childAges: "7-year-old",
    rating: 5,
    reviewText: "What surprised me most was the memory part. Weeks later, my son still remembers places we visited.",
    modeTag: "geoadventures",
  },
  {
    id: "6",
    parentName: "Nina",
    childAges: "10-year-old",
    rating: 5,
    reviewText: "It doesn't interrupt the trip — it enhances it. That's very rare for a kids app.",
    modeTag: "geoadventures",
  },
  {
    id: "7",
    parentName: "Rohit",
    childAges: "two kids",
    rating: 5,
    reviewText: "GeoQuest feels like it was built by parents. Nothing about it feels pushy or addictive.",
    modeTag: "both",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" data-testid="review-stars">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? "text-amber-400 fill-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewData }) {
  const modeLabel = review.modeTag === "both" 
    ? "GeoGames + GeoAdventures"
    : review.modeTag === "geogames" 
      ? "GeoGames" 
      : "GeoAdventures";

  const modeIcon = review.modeTag === "geoadventures" ? (
    <Plane className="w-3 h-3" />
  ) : review.modeTag === "geogames" ? (
    <Gamepad2 className="w-3 h-3" />
  ) : (
    <Globe className="w-3 h-3" />
  );

  const modeBgColor = review.modeTag === "geoadventures" 
    ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
    : review.modeTag === "geogames"
      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
      : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";

  return (
    <Card 
      className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`review-card-${review.id}`}
    >
      <CardContent className="p-5">
        <StarRating rating={review.rating} />
        
        <p className="mt-3 text-slate-700 dark:text-slate-200 leading-relaxed italic">
          "{review.reviewText}"
        </p>
        
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            — {review.parentName}, parent of a {/^\d+$/.test(review.childAges) ? `${review.childAges}-year-old` : review.childAges}
          </p>
          
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${modeBgColor}`}>
            {modeIcon}
            {modeLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reviews() {
  const [filter, setFilter] = useState<ModeFilter>("all");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [modalStartMode, setModalStartMode] = useState<"review" | "feedback">("review");
  const { requestAccess } = useParentalGate();

  const { data: dbReviews = [] } = useQuery<DbReview[]>({
    queryKey: ["reviews"],
    queryFn: async () => {
      const res = await fetch("/api/reviews");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const userSubmittedReviews: ReviewData[] = dbReviews.map((r) => ({
    id: `db-${r.id}`,
    parentName: r.parentName,
    childAges: r.childAges || "child",
    rating: r.rating,
    reviewText: r.reviewText,
    modeTag: r.modeTag,
    createdAt: r.createdAt,
  }));

  const sortedUserReviews = [...userSubmittedReviews].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  const allReviews = [...sortedUserReviews, ...sampleReviews];

  const filteredReviews = allReviews.filter((review) => {
    if (filter === "all") return true;
    if (filter === "geogames") return review.modeTag === "geogames" || review.modeTag === "both";
    if (filter === "geoadventures") return review.modeTag === "geoadventures" || review.modeTag === "both";
    return true;
  });

  const handleWriteReview = () => {
    requestAccess(() => {
      setModalStartMode("review");
      setShowFeedbackModal(true);
    });
  };

  const handleShareFeedback = () => {
    requestAccess(() => {
      setModalStartMode("feedback");
      setShowFeedbackModal(true);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container max-w-2xl mx-auto px-4 py-8 pb-safe">
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back to GeoQuest
          </Button>
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-3" data-testid="text-reviews-title">
            Loved by families who want learning without pressure
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Parents share how GeoQuest fits into real family life — at home and while traveling.
          </p>
          
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <p className="text-lg font-semibold text-slate-800 dark:text-white">
            4.9 average from parents
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Based on feedback from GeoQuest families
          </p>
          <Button
            onClick={handleWriteReview}
            className="mt-4 bg-violet-600 hover:bg-violet-700 gap-2"
            data-testid="button-write-review-top"
          >
            <Star className="w-4 h-4" />
            Leave a review
          </Button>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className={filter === "all" ? "bg-slate-800 dark:bg-slate-600" : ""}
            data-testid="filter-all"
          >
            All Reviews
          </Button>
          <Button
            variant={filter === "geogames" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("geogames")}
            className={filter === "geogames" ? "bg-violet-600 hover:bg-violet-700" : ""}
            data-testid="filter-geogames"
          >
            <Gamepad2 className="w-4 h-4 mr-1.5" />
            GeoGames
          </Button>
          <Button
            variant={filter === "geoadventures" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("geoadventures")}
            className={filter === "geoadventures" ? "bg-teal-600 hover:bg-teal-700" : ""}
            data-testid="filter-geoadventures"
          >
            <Plane className="w-4 h-4 mr-1.5" />
            GeoAdventures
          </Button>
        </div>

        <div className="space-y-4 mb-8">
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-50 to-sky-50 dark:from-violet-900/20 dark:to-sky-900/20">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2" data-testid="text-cta-title">
              Already using GeoQuest?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Your experience helps other families decide if GeoQuest is right for them.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={handleWriteReview}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
                data-testid="button-write-review"
              >
                <Star className="w-4 h-4" />
                Leave a review
              </Button>
              <Button 
                variant="ghost"
                onClick={handleShareFeedback}
                className="text-slate-600 dark:text-slate-300"
                data-testid="button-share-feedback"
              >
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                Share feedback instead
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-xs text-slate-400 dark:text-slate-500">
          <p>We never edit reviews for tone or content.</p>
          <p>Feedback helps us improve GeoQuest for families.</p>
        </div>
      </div>

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onDismiss={() => setShowFeedbackModal(false)}
        startMode={modalStartMode}
      />
    </div>
  );
}
