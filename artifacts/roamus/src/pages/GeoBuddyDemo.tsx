import { useState } from 'react';
import { motion } from 'framer-motion';
import { GeoBuddyCharacter, GeoBuddyWithMessage, GEOBUDDY_MESSAGES, type GeoBuddyState } from '@/components/GeoBuddyCharacter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Play, HelpCircle, Heart, Moon } from 'lucide-react';
import { Link } from 'wouter';

export default function GeoBuddyDemo() {
  const [activeState, setActiveState] = useState<GeoBuddyState>('idle');
  const [showFloating, setShowFloating] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState('');

  const states: { state: GeoBuddyState; label: string; icon: React.ReactNode; description: string }[] = [
    { state: 'idle', label: 'Idle', icon: <Moon className="w-4 h-4" />, description: 'Resting, gentle presence' },
    { state: 'listening', label: 'Listening', icon: <Play className="w-4 h-4" />, description: 'Attentive during audio facts' },
    { state: 'wondering', label: 'Wondering', icon: <HelpCircle className="w-4 h-4" />, description: 'Curious during prompts & games' },
    { state: 'remembering', label: 'Remembering', icon: <Heart className="w-4 h-4" />, description: 'Reflective during journaling' },
  ];

  const triggerFloating = (state: GeoBuddyState, message: string) => {
    setActiveState(state);
    setFloatingMessage(message);
    setShowFloating(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="back-home">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">GeoBuddy Character Demo</h1>
        </div>

        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">The Compass Creature</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              GeoBuddy is a quiet travel companion who helps kids notice, wonder, and remember — not a character that tells them what to do.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center gap-8 flex-wrap">
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <div key={size} className="text-center">
                  <GeoBuddyCharacter state={activeState} size={size} />
                  <p className="text-xs text-gray-500 mt-2 capitalize">{size}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Visual States</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Only 3 states + idle. GeoBuddy should appear briefly and fade away.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {states.map(({ state, label, icon, description }) => (
                <motion.button
                  key={state}
                  onClick={() => setActiveState(state)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    activeState === state
                      ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-400'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-200'
                  }`}
                  data-testid={`state-${state}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">With Speech Bubble</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              GeoBuddy speaks in 1-2 sentences max. Simple vocabulary, one idea at a time.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-end gap-12 flex-wrap py-8">
              <GeoBuddyCharacter 
                state="listening" 
                size="md" 
                message={GEOBUDDY_MESSAGES.listening.journeyPack}
                showMessage={true}
                autoHide={false}
              />
              <GeoBuddyCharacter 
                state="wondering" 
                size="md" 
                message={GEOBUDDY_MESSAGES.wondering.curious}
                showMessage={true}
                autoHide={false}
              />
              <GeoBuddyCharacter 
                state="remembering" 
                size="md" 
                message={GEOBUDDY_MESSAGES.remembering.moment}
                showMessage={true}
                autoHide={false}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">GeoAdventures Interactions</CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Test how GeoBuddy appears in different GeoAdventures moments.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start gap-2 h-auto py-3"
                onClick={() => triggerFloating('listening', GEOBUDDY_MESSAGES.listening.audioPlay)}
                data-testid="trigger-journey-pack"
              >
                <Play className="w-4 h-4 text-blue-500" />
                <div className="text-left">
                  <div className="font-medium text-sm">Journey Pack Start</div>
                  <div className="text-xs text-gray-500">Before arrival audio</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start gap-2 h-auto py-3"
                onClick={() => triggerFloating('wondering', GEOBUDDY_MESSAGES.wondering.gameStart)}
                data-testid="trigger-game"
              >
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <div className="text-left">
                  <div className="font-medium text-sm">Journey Game</div>
                  <div className="text-xs text-gray-500">Wonder prompt</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start gap-2 h-auto py-3"
                onClick={() => triggerFloating('remembering', GEOBUDDY_MESSAGES.remembering.save)}
                data-testid="trigger-moment"
              >
                <Heart className="w-4 h-4 text-rose-500" />
                <div className="text-left">
                  <div className="font-medium text-sm">Save a Moment</div>
                  <div className="text-xs text-gray-500">Journaling reflection</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start gap-2 h-auto py-3"
                onClick={() => triggerFloating('remembering', GEOBUDDY_MESSAGES.remembering.recall)}
                data-testid="trigger-recall"
              >
                <Heart className="w-4 h-4 text-purple-500" />
                <div className="text-left">
                  <div className="font-medium text-sm">Remember This</div>
                  <div className="text-xs text-gray-500">Recall prompt</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-3">Design Principles</h3>
            <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
              <li className="flex gap-2">
                <span className="text-amber-500">✓</span>
                <span>Calm, warm, optional — never loud or gamified</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">✓</span>
                <span>Appears briefly, then fades away quietly</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">✓</span>
                <span>Curious, not confident. Friendly, not funny</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">✓</span>
                <span>Never says "Correct!", "Wrong!", or "You should..."</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">✓</span>
                <span>Earth tones, soft colors, rounded shapes</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {showFloating && (
        <GeoBuddyWithMessage
          state={activeState}
          size="lg"
          message={floatingMessage}
          position="bottom-left"
          onComplete={() => setShowFloating(false)}
        />
      )}
    </div>
  );
}
