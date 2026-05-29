import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, TrendingUp, Gamepad2, Star, Clock, Calendar, BarChart3, Timer, Users, Activity, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface AnalyticsSummary {
  totalGamesPlayed: number;
  gamesByMode: { mode: string; count: number }[];
  completionRate: number;
  averageStars: number;
  averageTimeSeconds: number;
  dailyActivity: { date: string; count: number }[];
}

interface TimeSummary {
  totalAppTimeSeconds: number;
  totalGameTimeSeconds: number;
  averageSessionMinutes: number;
  totalSessions: number;
  averageGamesPerSession: number;
  dailyTimeData: { date: string; appTime: number; gameTime: number }[];
}

interface GameEvent {
  id: string;
  eventType: string;
  gameMode: string;
  starsEarned: number | null;
  timeSpentSeconds: number | null;
  completed: boolean | null;
  won: boolean | null;
  createdAt: string;
}

const gameModeLabels: Record<string, string> = {
  main_game: 'Main Game',
  daily_quest: 'Daily Quest',
  crossworld: 'CrossWorld',
  find_my_home: 'Find My Home',
};

const gameModeColors: Record<string, string> = {
  main_game: 'bg-green-500',
  daily_quest: 'bg-pink-500',
  crossworld: 'bg-indigo-500',
  find_my_home: 'bg-amber-500',
};

export default function Analytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeSummary, setTimeSummary] = useState<TimeSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<GameEvent[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('analytics_auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const res = await fetch('/api/analytics/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        sessionStorage.setItem('analytics_auth', 'true');
        setIsAuthenticated(true);
      } else {
        setAuthError('Incorrect password');
      }
    } catch {
      setAuthError('Failed to authenticate');
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [days, isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, eventsRes, timeRes] = await Promise.all([
        fetch(`/api/analytics/summary?days=${days}`),
        fetch('/api/analytics/events?limit=20'),
        fetch(`/api/analytics/time-summary?days=${days}`),
      ]);
      
      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }
      if (eventsRes.ok) {
        setRecentEvents(await eventsRes.json());
      }
      if (timeRes.ok) {
        setTimeSummary(await timeRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatHours = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const maxGameCount = summary?.gamesByMode?.length 
    ? Math.max(...summary.gamesByMode.map(g => g.count)) 
    : 1;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl">Analytics Dashboard</CardTitle>
            <p className="text-gray-600">Enter password to access analytics</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-analytics-password"
              />
              {authError && (
                <p className="text-red-500 text-sm">{authError}</p>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={authLoading || !password}
                data-testid="button-analytics-login"
              >
                {authLoading ? 'Checking...' : 'Access Analytics'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-indigo-800 flex items-center gap-2">
                <BarChart3 className="w-8 h-8" />
                Game Analytics
              </h1>
              <p className="text-gray-600">Track player engagement and game performance</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
                data-testid={`button-days-${d}`}
              >
                {d} Days
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white/90 shadow-lg border-2 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-green-600" />
                    Total Games Played
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700" data-testid="text-total-games">
                    {summary.totalGamesPlayed.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 shadow-lg border-2 border-yellow-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    Avg Stars Earned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-700" data-testid="text-avg-stars">
                    {summary.averageStars.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 shadow-lg border-2 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700" data-testid="text-completion-rate">
                    {summary.completionRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 shadow-lg border-2 border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Avg Game Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-700" data-testid="text-avg-time">
                    {formatTime(summary.averageTimeSeconds)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {timeSummary && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
                  <Timer className="w-6 h-6" />
                  Time Tracking
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card className="bg-white/90 shadow-lg border-2 border-teal-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-teal-600" />
                        Total App Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-teal-700" data-testid="text-total-app-time">
                        {formatHours(timeSummary.totalAppTimeSeconds)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Time on website</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/90 shadow-lg border-2 border-orange-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4 text-orange-600" />
                        Total Game Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-700" data-testid="text-total-game-time">
                        {formatHours(timeSummary.totalGameTimeSeconds)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Time playing games</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/90 shadow-lg border-2 border-cyan-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-600" />
                        Avg Session
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-cyan-700" data-testid="text-avg-session">
                        {timeSummary.averageSessionMinutes.toFixed(1)}m
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Per visit</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/90 shadow-lg border-2 border-pink-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4 text-pink-600" />
                        Total Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-pink-700" data-testid="text-total-sessions">
                        {timeSummary.totalSessions.toLocaleString()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Unique visits</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/90 shadow-lg border-2 border-violet-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-violet-600" />
                        Games/Session
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-violet-700" data-testid="text-games-per-session">
                        {timeSummary.averageGamesPerSession.toFixed(1)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Avg games played</p>
                    </CardContent>
                  </Card>
                </div>

                {timeSummary.dailyTimeData.length > 0 && (
                  <Card className="bg-white/90 shadow-lg mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Timer className="w-5 h-5 text-indigo-600" />
                        Daily Time Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end justify-between h-48 gap-1">
                        {timeSummary.dailyTimeData.slice(-14).map((day) => {
                          const maxTime = Math.max(...timeSummary.dailyTimeData.map(d => d.appTime));
                          const appHeight = maxTime > 0 ? (day.appTime / maxTime) * 100 : 0;
                          const gameHeight = maxTime > 0 ? (day.gameTime / maxTime) * 100 : 0;
                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center">
                              <div className="w-full flex flex-col items-center justify-end h-40 relative">
                                <div
                                  className="w-full bg-teal-300 rounded-t-sm absolute bottom-0"
                                  style={{ height: `${Math.max(appHeight, 2)}%` }}
                                />
                                <div
                                  className="w-full bg-orange-500 rounded-t-sm absolute bottom-0"
                                  style={{ height: `${Math.max(gameHeight, 2)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 mt-1">
                                {new Date(day.date).getDate()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-center gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-teal-300"></div>
                          <span className="text-gray-600">App Time</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded bg-orange-500"></div>
                          <span className="text-gray-600">Game Time</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-white/90 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-indigo-600" />
                    Games by Mode
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.gamesByMode.length > 0 ? (
                    <div className="space-y-4">
                      {summary.gamesByMode.map((game) => (
                        <div key={game.mode}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">
                              {gameModeLabels[game.mode] || game.mode}
                            </span>
                            <span className="text-gray-600">{game.count} plays</span>
                          </div>
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${gameModeColors[game.mode] || 'bg-gray-500'} transition-all`}
                              style={{ width: `${(game.count / maxGameCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No game data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/90 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Daily Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {summary.dailyActivity.length > 0 ? (
                    <div className="flex items-end justify-between h-40 gap-1">
                      {summary.dailyActivity.slice(-14).map((day) => {
                        const maxCount = Math.max(...summary.dailyActivity.map(d => d.count));
                        const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex flex-col items-center justify-end h-32">
                              <span className="text-xs text-gray-600 mb-1">{day.count}</span>
                              <div
                                className="w-full bg-indigo-500 rounded-t-sm transition-all"
                                style={{ height: `${Math.max(height, 4)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {new Date(day.date).getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No activity data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/90 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-800">Recent Game Events</CardTitle>
              </CardHeader>
              <CardContent>
                {recentEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Time</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Event</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Game Mode</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Stars</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Duration</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentEvents.map((event) => (
                          <tr key={event.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-500">
                              {new Date(event.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">
                              <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs text-white ${gameModeColors[event.gameMode] || 'bg-gray-500'}`}>
                                {gameModeLabels[event.gameMode] || event.gameMode}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {event.starsEarned !== null ? (
                                <span className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  {event.starsEarned}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-2 px-3">
                              {event.timeSpentSeconds !== null ? formatTime(event.timeSpentSeconds) : '-'}
                            </td>
                            <td className="py-2 px-3">
                              {event.completed !== null && (
                                <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                  event.won ? 'bg-green-100 text-green-700' : 
                                  event.completed ? 'bg-blue-100 text-blue-700' : 
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {event.won ? 'Won' : event.completed ? 'Completed' : 'In Progress'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No events recorded yet. Play some games to see data here!</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Failed to load analytics data. Please try again.</p>
            <Button onClick={fetchData} className="mt-4">Retry</Button>
          </div>
        )}
      </div>
    </div>
  );
}
