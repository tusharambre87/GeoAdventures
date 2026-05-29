import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, Heart, Shield, Sparkles, Compass } from "lucide-react";
import { Link } from "wouter";
import { QuietPromiseBanner } from "@/components/GeoAdventuresAnchoring";

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back to GeoQuest
          </Button>
        </Link>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 mb-4">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2" data-testid="text-about-title">
                About GeoQuest
              </h1>
            </div>

            <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-rose-500 flex-shrink-0 mt-1" />
                <span>
                  GeoQuest was built by parents who wanted calmer, more meaningful screen time for their kids.
                </span>
              </p>

              <p className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
                <span>
                  We believe kids learn best through curiosity, not pressure or memorization.
                </span>
              </p>

              <p className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-sky-500 flex-shrink-0 mt-1" />
                <span>
                  Our games are designed to fit real life — short, engaging, and easy to come back to.
                </span>
              </p>

              <p className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                <span>
                  There are no ads, no social features, and no hidden distractions.
                </span>
              </p>

              <p className="text-center font-medium text-slate-800 dark:text-white pt-4 border-t border-slate-200 dark:border-slate-700">
                Just a better way for kids to explore the world through play.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* GeoAdventures Section */}
        <Card className="border-0 shadow-lg mt-6">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white" data-testid="text-geoadventures-title">
                GeoAdventures
              </h2>
            </div>

            <p className="text-slate-600 dark:text-slate-300 mb-4">
              GeoAdventures is our family travel mode — designed to help kids experience real places, not just see them through a screen.
            </p>

            <QuietPromiseBanner variant="prominent" className="mb-4" />

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Before each stop, kids listen to stories and play games. When you arrive, the app encourages you to put the phone away. After your visit, reflection games help families remember and share what they experienced together.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
