import { useState, useEffect } from "react";

type Tab = 'overview' | 'geogames' | 'geoadventures' | 'sessions' | 'users' | 'promo' | 'canonical' | 'photos' | 'guide-subscribers';

function useAdminAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/admin/verify', { headers: { 'x-admin-token': token } })
      .then(r => { setIsValid(r.ok); if (!r.ok) { localStorage.removeItem('admin_token'); setToken(null); } })
      .catch(() => { setIsValid(false); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    localStorage.setItem('admin_token', data.token);
    setToken(data.token);
    setIsValid(true);
  };

  const logout = () => {
    if (token) fetch('/api/admin/logout', { method: 'POST', headers: { 'x-admin-token': token } });
    localStorage.removeItem('admin_token');
    setToken(null);
    setIsValid(false);
  };

  return { token, isValid, loading, login, logout };
}

function useAdminFetch<T>(endpoint: string, token: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(endpoint, { headers: { 'x-admin-token': token } })
      .then(r => { if (!r.ok) throw new Error('Failed to fetch'); return r.json(); })
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [endpoint, token]);

  return { data, loading, error };
}

function LoginForm({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try { await onLogin(email, password); }
    catch { setError('Invalid email or password'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <form onSubmit={handleSubmit} style={{ background: '#1e293b', padding: 40, borderRadius: 12, width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
        <h1 style={{ color: '#f8fafc', fontSize: 24, marginBottom: 8, textAlign: 'center' }}>GeoQuest Admin</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>Sign in to access the dashboard</p>
        {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '8px 12px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <input data-testid="input-admin-email" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', marginBottom: 12, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }} />
        <input data-testid="input-admin-password" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', marginBottom: 20, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }} />
        <button data-testid="button-admin-login" type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function ClickableStatCard({ label, value, sub, onClick, isExpanded }: { label: string; value: string | number; sub?: string; onClick?: () => void; isExpanded?: boolean }) {
  return (
    <div
      data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
      style={{
        background: isExpanded ? '#253348' : '#1e293b',
        borderRadius: 12,
        padding: '20px 24px',
        flex: '1 1 200px',
        minWidth: 180,
        cursor: onClick ? 'pointer' : 'default',
        border: isExpanded ? '2px solid #3b82f6' : '2px solid transparent',
        transition: 'all 0.2s',
      }}>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {label}
        {onClick && <span style={{ fontSize: 11, color: '#3b82f6' }}>{isExpanded ? 'Close' : 'Click for details'}</span>}
      </div>
      <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', flex: '1 1 200px', minWidth: 180 }}>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DataTable({ headers, rows, onRowClick }: { headers: string[]; rows: (string | number)[][]; onRowClick?: (idx: number) => void }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '10px 12px', color: '#94a3b8', borderBottom: '1px solid #334155', fontWeight: 600 }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} onClick={() => onRowClick?.(ri)} style={{ cursor: onRowClick ? 'pointer' : 'default', background: ri % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)' }}>
              {row.map((cell, ci) => <td key={ci} style={{ padding: '10px 12px', color: '#e2e8f0', borderBottom: '1px solid #1e293b' }}>{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={headers.length} style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SimpleBar({ data, maxWidth = 300 }: { data: { label: string; value: number }[]; maxWidth?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 120, color: '#94a3b8', fontSize: 13, textAlign: 'right', flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, maxWidth, background: '#0f172a', borderRadius: 4, height: 24, position: 'relative' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: 4, minWidth: d.value > 0 ? 4 : 0 }} />
          </div>
          <div style={{ color: '#e2e8f0', fontSize: 13, width: 50 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}

function DetailPanel({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 16, border: '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 16, margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: '#334155', border: 'none', color: '#94a3b8', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Close</button>
      </div>
      {children}
    </div>
  );
}

function OverviewTab({ token }: { token: string }) {
  const { data, loading } = useAdminFetch<any>('/api/admin/overview', token);
  const usersData = useAdminFetch<any>('/api/admin/users', token);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!data) return <div style={{ color: '#ef4444', padding: 40 }}>Failed to load data</div>;

  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key);

  return (
    <div>
      <h2 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 16 }}>Platform Overview</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <ClickableStatCard label="Total Users" value={data.users.totalUsers} sub={`${data.users.withEmail} with email`} onClick={() => toggle('users')} isExpanded={expanded === 'users'} />
        <ClickableStatCard label="Total Explorers" value={data.explorers.totalExplorers} sub={`${data.explorers.guestExplorers} guests`} onClick={() => toggle('explorers')} isExpanded={expanded === 'explorers'} />
        <ClickableStatCard label="Total Sessions" value={data.sessions.totalSessions} sub={`${data.sessions.uniqueVisitors} unique visitors`} onClick={() => toggle('sessions')} isExpanded={expanded === 'sessions'} />
        <StatCard label="Games Played" value={data.sessions.totalGamesPlayed} />
      </div>

      {expanded === 'users' && usersData.data && (
        <DetailPanel title="All Users - Detailed Breakdown" onClose={() => setExpanded(null)}>
          <DataTable
            headers={['Email', 'Name', 'Country', 'Status', 'Explorers', 'Sessions', 'Trips', 'Joined']}
            rows={usersData.data.users.map((u: any) => [
              u.email || '-',
              `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-',
              u.detectedCountry || '-',
              u.accountStatus,
              u.explorerCount,
              u.sessionCount,
              u.tripCount,
              u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-',
            ])}
          />
        </DetailPanel>
      )}

      {expanded === 'explorers' && usersData.data && (
        <DetailPanel title="All Explorers by User" onClose={() => setExpanded(null)}>
          <DataTable
            headers={['Parent Email', 'Explorers', 'Country', 'Status', 'Sessions', 'Trips']}
            rows={usersData.data.users
              .filter((u: any) => u.explorerCount > 0)
              .map((u: any) => [
                u.email || '-',
                u.explorerCount,
                u.detectedCountry || '-',
                u.accountStatus,
                u.sessionCount,
                u.tripCount,
              ])}
          />
        </DetailPanel>
      )}

      {expanded === 'sessions' && (
        <DetailPanel title="Session Details" onClose={() => setExpanded(null)}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <StatCard label="Desktop" value={data.sessions.desktopCount} />
            <StatCard label="Mobile" value={data.sessions.mobileCount} />
            <StatCard label="Tablet" value={data.sessions.tabletCount} />
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>For full OS/browser/hostname data, see the Sessions tab.</p>
        </DetailPanel>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="Trial Users" value={data.users.trialUsers} />
        <StatCard label="Paid Users" value={data.users.paidUsers} />
        <StatCard label="Founding Families" value={data.users.foundingFamilies} />
        <StatCard label="Admin Accounts" value={data.users.adminCount} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Users by Country</h3>
          {data.countryBreakdown.length > 0 ? (
            <SimpleBar data={data.countryBreakdown.map((c: any) => ({ label: c.country || 'Unknown', value: Number(c.count) }))} />
          ) : <div style={{ color: '#64748b' }}>No country data</div>}
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Pricing Band Distribution</h3>
          <SimpleBar data={data.pricingBandBreakdown.map((p: any) => ({ label: `Band ${p.band || '?'}`, value: Number(p.count) }))} />
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Signups (Last 30 Days)</h3>
        <DataTable
          headers={['Date', 'Signups']}
          rows={data.signupsByDay.map((d: any) => [d.date, d.count])}
        />
      </div>
    </div>
  );
}

function GeoGamesTab({ token }: { token: string }) {
  const { data, loading } = useAdminFetch<any>('/api/admin/geogames', token);
  if (loading) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!data) return <div style={{ color: '#ef4444', padding: 40 }}>Failed to load data</div>;

  return (
    <div>
      <h2 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 16 }}>GeoGames Activity</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        {data.gameStats.map((g: any) => (
          <StatCard key={g.gameType} label={formatGameType(g.gameType)} value={g.totalGames} sub={`${g.totalPlayers} players, ${g.totalWins} wins`} />
        ))}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Game Type Breakdown</h3>
        <SimpleBar data={data.gameStats.map((g: any) => ({ label: formatGameType(g.gameType), value: Number(g.totalGames) }))} />
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Top Players</h3>
        <DataTable
          headers={['Explorer', 'Game', 'Total Games', 'Wins']}
          rows={data.topPlayers.map((p: any) => [p.playerName || 'Unknown', formatGameType(p.gameType), p.totalGames, p.wins])}
        />
      </div>
    </div>
  );
}

function GeoAdventuresTab({ token }: { token: string }) {
  const { data, loading } = useAdminFetch<any>('/api/admin/geoadventures', token);
  const [expanded, setExpanded] = useState<string | null>(null);
  if (loading) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!data) return <div style={{ color: '#ef4444', padding: 40 }}>Failed to load data</div>;

  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key);

  return (
    <div>
      <h2 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 16 }}>GeoAdventures Activity</h2>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <ClickableStatCard label="Total Trips" value={data.trips.totalTrips} onClick={() => toggle('trips')} isExpanded={expanded === 'trips'} />
        <ClickableStatCard label="Build Your Adventure" value={data.trips.travelTrips} sub="Travel trips" onClick={() => toggle('travel')} isExpanded={expanded === 'travel'} />
        <ClickableStatCard label="Explore from Home" value={data.trips.homeTrips} sub="Home trips" onClick={() => toggle('home')} isExpanded={expanded === 'home'} />
        <ClickableStatCard label="Adventure Started" value={data.trips.startedAdventures} sub={`of ${data.trips.totalTrips} total`} onClick={() => toggle('started')} isExpanded={expanded === 'started'} />
        <StatCard label="Completed" value={data.trips.completedAdventures} />
      </div>

      {expanded === 'trips' && (
        <DetailPanel title="All Trips by User" onClose={() => setExpanded(null)}>
          <DataTable
            headers={['User Email', 'Total Trips', 'Started', 'Travel', 'Explore Home']}
            rows={data.tripsByUser.map((u: any) => [u.email || 'Unknown', u.tripCount, u.startedCount, u.travelCount, u.homeCount])}
          />
        </DetailPanel>
      )}

      {expanded === 'travel' && (
        <DetailPanel title="Travel Trips (Build Your Adventure)" onClose={() => setExpanded(null)}>
          <DataTable
            headers={['User Email', 'Travel Trips', 'Started']}
            rows={data.tripsByUser.filter((u: any) => Number(u.travelCount) > 0).map((u: any) => [u.email || 'Unknown', u.travelCount, u.startedCount])}
          />
        </DetailPanel>
      )}

      {expanded === 'home' && (
        <DetailPanel title="Explore from Home Trips" onClose={() => setExpanded(null)}>
          <DataTable
            headers={['User Email', 'Home Trips']}
            rows={data.tripsByUser.filter((u: any) => Number(u.homeCount) > 0).map((u: any) => [u.email || 'Unknown', u.homeCount])}
          />
        </DetailPanel>
      )}

      {expanded === 'started' && (
        <DetailPanel title="Users Who Started Adventures" onClose={() => setExpanded(null)}>
          <DataTable
            headers={['User Email', 'Started Trips', 'Total Trips']}
            rows={data.tripsByUser.filter((u: any) => Number(u.startedCount) > 0).map((u: any) => [u.email || 'Unknown', u.startedCount, u.tripCount])}
          />
        </DetailPanel>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <ClickableStatCard label="Total Stops" value={data.stops.totalStops} sub={`${data.stops.visitedStops} visited`} onClick={() => toggle('stops')} isExpanded={expanded === 'stops'} />
        <StatCard label="Journey Packs Completed" value={data.stops.withJourneyPack} />
        <StatCard label="Moments Saved" value={data.moments.totalMoments} sub={`${data.moments.withPhotos} with photos`} />
      </div>

      {expanded === 'stops' && (
        <DetailPanel title="Stop Types Breakdown" onClose={() => setExpanded(null)}>
          <SimpleBar data={data.stopTypes.map((s: any) => ({ label: s.stopType || 'Default', value: Number(s.count) }))} />
        </DetailPanel>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Journey Pack Engagement</h3>
          <SimpleBar data={[
            { label: 'Listened to Stories', value: Number(data.journeyPacks.withListen) },
            { label: 'Wonder Responses', value: Number(data.journeyPacks.withWonder) },
            { label: 'Total Progress', value: Number(data.journeyPacks.totalProgress) },
          ]} />
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Experience City Usage</h3>
          <SimpleBar data={[
            { label: 'Food & Culture', value: Number(data.experience.foodCultureViewed) },
            { label: 'Hear the Place', value: Number(data.experience.hearPlaceViewed) },
            { label: 'Everyday Life', value: Number(data.experience.everydayLifeViewed) },
            { label: 'Total Progress', value: Number(data.experience.totalProgress) },
          ]} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Trips by Country</h3>
          {data.tripsByCountry.length > 0 ? (
            <SimpleBar data={data.tripsByCountry.map((c: any) => ({ label: c.country || 'Unknown', value: Number(c.count) }))} />
          ) : <div style={{ color: '#64748b' }}>No data</div>}
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Trips by City</h3>
          <DataTable
            headers={['City', 'Country', 'Trips']}
            rows={data.tripsByCity.map((c: any) => [c.city || 'Unknown', c.country || '-', c.count])}
          />
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Journey Game Types</h3>
        {data.journeyGameStats.length > 0 ? (
          <SimpleBar data={data.journeyGameStats.map((g: any) => ({ label: g.game_type || 'Unknown', value: Number(g.count) }))} />
        ) : <div style={{ color: '#64748b' }}>No data</div>}
      </div>
    </div>
  );
}

function SessionsTab({ token }: { token: string }) {
  const { data, loading } = useAdminFetch<any>('/api/admin/sessions', token);
  if (loading) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!data) return <div style={{ color: '#ef4444', padding: 40 }}>Failed to load data</div>;

  return (
    <div>
      <h2 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 16 }}>Session Analytics</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Domain Breakdown</h3>
          {data.hostnameBreakdown && data.hostnameBreakdown.length > 0 ? (
            <SimpleBar data={data.hostnameBreakdown.map((h: any) => ({ label: h.hostname || 'Unknown', value: Number(h.count) }))} />
          ) : data.hostnames.length > 0 ? (
            <SimpleBar data={data.hostnames.map((h: any) => ({ label: h.hostname, value: Number(h.count) }))} />
          ) : <div style={{ color: '#64748b' }}>No hostname data yet (will populate with new sessions)</div>}
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>OS / Platform</h3>
          {data.osBreakdown && data.osBreakdown.length > 0 ? (
            <SimpleBar data={data.osBreakdown.map((o: any) => ({ label: o.os || 'Unknown', value: Number(o.count) }))} />
          ) : <div style={{ color: '#64748b' }}>No OS data yet (will populate with new sessions)</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Device Breakdown</h3>
          <SimpleBar data={data.deviceBreakdown.map((d: any) => ({ label: d.device || 'Unknown', value: Number(d.count) }))} />
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Browser</h3>
          {data.browserBreakdown && data.browserBreakdown.length > 0 ? (
            <SimpleBar data={data.browserBreakdown.map((b: any) => ({ label: b.browser || 'Unknown', value: Number(b.count) }))} />
          ) : <div style={{ color: '#64748b' }}>No browser data yet (will populate with new sessions)</div>}
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Top Landing Pages</h3>
        <DataTable
          headers={['Page', 'Sessions']}
          rows={data.landingPages.map((p: any) => [p.page || 'Unknown', p.count])}
        />
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Sessions (Last 30 Days)</h3>
        <DataTable
          headers={['Date', 'Sessions', 'Unique Visitors', 'Avg Time (sec)']}
          rows={data.sessionsByDay.map((d: any) => [d.date, d.count, d.uniqueVisitors, Math.round(Number(d.avgTime))])}
        />
      </div>
    </div>
  );
}

function UserDetailModal({ userId, token, onClose }: { userId: string; token: string; onClose: () => void }) {
  const { data, loading } = useAdminFetch<any>(`/api/admin/users/${userId}`, token);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div style={{ background: '#1e293b', borderRadius: 16, maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'auto', padding: 32 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#f8fafc', fontSize: 20, margin: 0 }}>User Details</h2>
          <button data-testid="button-close-modal" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}>x</button>
        </div>

        {loading && <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading...</div>}
        {data && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <DetailRow label="Email" value={data.user.email} />
              <DetailRow label="Name" value={`${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || '-'} />
              <DetailRow label="Country" value={data.user.detectedCountry || 'Unknown'} />
              <DetailRow label="Pricing Band" value={data.user.pricingBand || '-'} />
              <DetailRow label="Locale" value={data.user.signupLocale || '-'} />
              <DetailRow label="Timezone" value={data.user.signupTimezone || '-'} />
              <DetailRow label="Created" value={data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : '-'} />
              <DetailRow label="Status" value={data.user.stripeSubscriptionId ? 'Paid' : data.user.trialStartDate ? 'Trial' : data.user.isAdmin ? 'Admin' : 'Free'} />
            </div>

            <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 12 }}>Explorers ({data.explorers.length})</h3>
            {data.explorers.length > 0 ? (
              <DataTable
                headers={['Name', 'Age', 'Created']}
                rows={data.explorers.map((e: any) => [e.name, e.age, e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'])}
              />
            ) : <div style={{ color: '#64748b', marginBottom: 16 }}>No explorers</div>}

            <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 12, marginTop: 20 }}>Game Stats</h3>
            {data.gameStats.length > 0 ? (
              <DataTable
                headers={['Game', 'Total', 'Wins', 'Losses']}
                rows={data.gameStats.map((g: any) => [formatGameType(g.gameType), g.totalGames, g.wins, g.losses])}
              />
            ) : <div style={{ color: '#64748b', marginBottom: 16 }}>No game activity</div>}

            <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 12, marginTop: 20 }}>Trips ({data.trips.length})</h3>
            {data.trips.length > 0 ? (
              <DataTable
                headers={['Destination', 'Type', 'Status', 'Started', 'Created']}
                rows={data.trips.map((t: any) => [
                  t.destination || t.city || '-',
                  t.adventureContext === 'home' ? 'Explore Home' : 'Travel',
                  t.adventureStartedAt ? 'Started' : 'Not Started',
                  t.adventureStartedAt ? new Date(t.adventureStartedAt).toLocaleDateString() : '-',
                  t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-',
                ])}
              />
            ) : <div style={{ color: '#64748b', marginBottom: 16 }}>No trips</div>}

            <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 12, marginTop: 20 }}>Recent Sessions ({data.sessions.length})</h3>
            {data.sessions.length > 0 ? (
              <DataTable
                headers={['Date', 'Duration (s)', 'Pages', 'Games', 'Device', 'OS', 'Landing Page']}
                rows={data.sessions.map((s: any) => [
                  s.sessionStart ? new Date(s.sessionStart).toLocaleString() : '-',
                  s.totalTimeSeconds || 0,
                  s.pagesVisited || 0,
                  s.gamesPlayed || 0,
                  s.deviceType || '-',
                  s.osPlatform || '-',
                  s.landingPage || '-',
                ])}
              />
            ) : <div style={{ color: '#64748b' }}>No sessions</div>}

            {data.experienceProgress.length > 0 && (
              <>
                <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 12, marginTop: 20 }}>Experience City Progress</h3>
                <DataTable
                  headers={['Destination', 'Food & Culture', 'Hear Place', 'Everyday Life']}
                  rows={data.experienceProgress.map((ep: any) => [
                    ep.destinationName,
                    ep.foodCultureState || '-',
                    ep.hearPlaceState || '-',
                    ep.everydayLifeState || '-',
                  ])}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
      <div style={{ color: '#e2e8f0', fontSize: 14 }}>{value || '-'}</div>
    </div>
  );
}

function UsersTab({ token }: { token: string }) {
  const { data, loading } = useAdminFetch<any>('/api/admin/users', token);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (loading) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!data) return <div style={{ color: '#ef4444', padding: 40 }}>Failed to load data</div>;

  const filteredUsers = data.users.filter((u: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.email || '').toLowerCase().includes(s) ||
      (u.firstName || '').toLowerCase().includes(s) ||
      (u.lastName || '').toLowerCase().includes(s) ||
      (u.detectedCountry || '').toLowerCase().includes(s);
  });

  return (
    <div>
      <h2 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 16 }}>Users ({data.users.length})</h2>
      <input data-testid="input-user-search" placeholder="Search by email, name, or country..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', maxWidth: 400, padding: '10px 14px', marginBottom: 20, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: 14, boxSizing: 'border-box' }} />

      <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
        <DataTable
          headers={['Email', 'Name', 'Country', 'Status', 'Explorers', 'Sessions', 'Trips', 'Joined']}
          rows={filteredUsers.map((u: any) => [
            u.email || '-',
            `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-',
            u.detectedCountry || '-',
            u.accountStatus,
            u.explorerCount,
            u.sessionCount,
            u.tripCount,
            u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-',
          ])}
          onRowClick={(idx) => setSelectedUserId(filteredUsers[idx]?.id)}
        />
      </div>

      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} token={token} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}

function PromoCodesTab({ token }: { token: string }) {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyInviteLink = (code: string, id: string) => {
    const link = `${window.location.origin}/unlock?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // New code form
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    label: '',
    accessType: 'full_free',
    discountType: 'percent',
    discountValue: '',
    maxUses: '100',
    oneUsePerUser: true,
    appliesGlobally: true,
    expiresAt: '',
    notes: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const headers = { 'x-admin-token': token };

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promo/codes', { headers });
      const data = await res.json();
      setCodes(data.codes || []);
    } catch { setError('Failed to load promo codes'); }
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/admin/promo/codes/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchCodes();
  };

  const viewRedemptions = async (id: string) => {
    if (selectedCode === id) { setSelectedCode(null); return; }
    setSelectedCode(id);
    setLoadingRedemptions(true);
    const res = await fetch(`/api/admin/promo/codes/${id}/redemptions`, { headers });
    const data = await res.json();
    setRedemptions(data.redemptions || []);
    setLoadingRedemptions(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/promo/codes', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          discountValue: form.discountValue ? Number(form.discountValue) : null,
          maxUses: Number(form.maxUses),
          expiresAt: form.expiresAt || null,
          createdBy: 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.message || 'Failed'); setCreating(false); return; }
      setFormOpen(false);
      setForm({ code: '', label: '', accessType: 'full_free', discountType: 'percent', discountValue: '', maxUses: '100', oneUsePerUser: true, appliesGlobally: true, expiresAt: '', notes: '' });
      fetchCodes();
    } catch { setCreateError('Network error'); }
    setCreating(false);
  };

  const iStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13 };
  const lStyle: React.CSSProperties = { fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Promo Codes</h2>
        <button
          onClick={() => setFormOpen(v => !v)}
          style={{ padding: '8px 16px', borderRadius: 8, background: '#E8962F', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}
          data-testid="button-new-promo-code"
        >
          + New Code
        </button>
      </div>

      {/* Create form */}
      {formOpen && (
        <form onSubmit={handleCreate} style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #334155' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px', color: '#f1f5f9' }}>Create Promo Code</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lStyle}>Code *</label>
              <input required style={iStyle} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="MYCODE2024" data-testid="input-new-code" />
            </div>
            <div>
              <label style={lStyle}>Label</label>
              <input style={iStyle} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Partner promo" />
            </div>
            <div>
              <label style={lStyle}>Access Type *</label>
              <select required style={iStyle} value={form.accessType} onChange={e => setForm(f => ({ ...f, accessType: e.target.value }))}>
                <option value="full_free">Full Free (no payment)</option>
                <option value="discounted">Discounted (reduced price)</option>
              </select>
            </div>
            {form.accessType === 'discounted' && (
              <>
                <div>
                  <label style={lStyle}>Discount Type</label>
                  <select style={iStyle} value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value }))}>
                    <option value="percent">Percent (%)</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="founding_price">Founding Price</option>
                  </select>
                </div>
                <div>
                  <label style={lStyle}>Discount Value</label>
                  <input style={iStyle} type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder="e.g. 50 for 50% off" />
                </div>
              </>
            )}
            <div>
              <label style={lStyle}>Max Uses</label>
              <input style={iStyle} type="number" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
            </div>
            <div>
              <label style={lStyle}>Expires At</label>
              <input style={iStyle} type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lStyle}>Notes</label>
              <input style={iStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes…" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="oneUse" checked={form.oneUsePerUser} onChange={e => setForm(f => ({ ...f, oneUsePerUser: e.target.checked }))} />
              <label htmlFor="oneUse" style={{ ...lStyle, marginBottom: 0, cursor: 'pointer' }}>One use per user</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="global" checked={form.appliesGlobally} onChange={e => setForm(f => ({ ...f, appliesGlobally: e.target.checked }))} />
              <label htmlFor="global" style={{ ...lStyle, marginBottom: 0, cursor: 'pointer' }}>Applies globally</label>
            </div>
          </div>
          {createError && <p style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{createError}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" disabled={creating} style={{ padding: '8px 18px', borderRadius: 8, background: '#E8962F', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              {creating ? 'Creating…' : 'Create Code'}
            </button>
            <button type="button" onClick={() => setFormOpen(false)} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', color: '#94a3b8', fontSize: 13, border: '1px solid #334155', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <p style={{ color: '#94a3b8' }}>Loading…</p>}
      {error && <p style={{ color: '#f87171' }}>{error}</p>}

      {!loading && codes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🎟️</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>No promo codes yet</p>
          <p style={{ fontSize: 13 }}>Click "New Code" to create your first one.</p>
        </div>
      )}

      {/* Codes table */}
      {codes.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Code', 'Type', 'Discount', 'Uses', 'Expires', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((c: any) => (
                <>
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(51,65,85,0.5)', cursor: 'pointer' }} onClick={() => viewRedemptions(c.id)} data-testid={`row-promo-${c.id}`}>
                    <td style={{ padding: '10px 14px' }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', margin: 0, fontFamily: 'monospace' }}>{c.code}</p>
                      {c.label && <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{c.label}</p>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>
                      <span style={{ background: c.accessType === 'full_free' ? 'rgba(34,197,94,0.1)' : 'rgba(232,150,47,0.1)', color: c.accessType === 'full_free' ? '#4ade80' : '#E8962F', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                        {c.accessType === 'full_free' ? 'FREE' : 'DISCOUNT'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>
                      {c.accessType === 'discounted' ? (c.discountType === 'percent' ? `${c.discountValue}% off` : c.discountType === 'fixed_amount' ? `-${c.discountValue} cents` : 'Founding price') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>{c.usedCount ?? 0} / {c.maxUses}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: c.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: c.isActive ? '#4ade80' : '#f87171', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          onClick={() => copyInviteLink(c.code, c.id)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700, border: 'none',
                            background: copiedId === c.id ? 'rgba(34,197,94,0.15)' : 'rgba(232,150,47,0.15)',
                            color: copiedId === c.id ? '#4ade80' : '#E8962F',
                          }}
                          data-testid={`button-copy-link-${c.id}`}
                          title={`Copy: ${window.location.origin}/unlock?code=${c.code}`}
                        >
                          {copiedId === c.id ? '✓ Copied!' : '🔗 Copy Link'}
                        </button>
                        <button
                          onClick={() => toggleActive(c.id, c.isActive)}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', border: '1px solid #475569', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}
                          data-testid={`button-toggle-promo-${c.id}`}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Redemptions sub-table */}
                  {selectedCode === c.id && (
                    <tr key={`${c.id}-redemptions`}>
                      <td colSpan={7} style={{ padding: '0 14px 14px', background: 'rgba(0,0,0,0.2)' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '10px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Redemptions</p>
                        {loadingRedemptions ? (
                          <p style={{ color: '#64748b', fontSize: 12 }}>Loading…</p>
                        ) : redemptions.length === 0 ? (
                          <p style={{ color: '#475569', fontSize: 12 }}>No redemptions yet.</p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {['User', 'Trip', 'Redeemed At'].map(h => (
                                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 10, fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {redemptions.map((r: any) => (
                                <tr key={r.id}>
                                  <td style={{ padding: '6px 10px', fontSize: 12, color: '#94a3b8' }}>{r.userEmail}</td>
                                  <td style={{ padding: '6px 10px', fontSize: 12, color: '#94a3b8' }}>{r.tripId || '—'}</td>
                                  <td style={{ padding: '6px 10px', fontSize: 12, color: '#94a3b8' }}>{new Date(r.redeemedAt).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CanonicalTemplatesTab({ token }: { token: string }) {
  const { data, loading, error } = useAdminFetch<any>('/api/admin/canonical-stats', token);

  if (loading) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (error || !data) return <div style={{ color: '#ef4444', padding: 40 }}>Failed to load canonical stats</div>;

  const templateBreakdown: Record<string, number> = data.templateBreakdown || {};
  const templateRows = Object.entries(templateBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => [name, count]);

  const rerollDelta = data.avgRerollsAi - data.avgRerollsCanonical;
  const deltaLabel = rerollDelta > 0
    ? `${rerollDelta.toFixed(2)} fewer re-rolls vs AI`
    : rerollDelta < 0
    ? `${Math.abs(rerollDelta).toFixed(2)} more re-rolls vs AI`
    : 'same as AI';

  return (
    <div data-testid="canonical-templates-tab">
      <h2 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 8 }}>Canonical Template Quality</h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
        Indian trips — comparing canonical template stops vs AI-generated stops by re-roll rate.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard
          label="Total Indian Trips"
          value={data.totalIndianTrips}
        />
        <StatCard
          label="Canonical Trips"
          value={data.canonicalTrips}
          sub={`${data.canonicalPercent}% of total`}
        />
        <StatCard
          label="AI-Only Trips"
          value={data.aiOnlyTrips}
          sub={`${100 - data.canonicalPercent}% of total`}
        />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', flex: '1 1 200px', minWidth: 200 }} data-testid="stat-avg-rerolls-canonical">
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>Avg Re-rolls — Canonical</div>
          <div style={{ color: '#4ade80', fontSize: 28, fontWeight: 700 }}>{data.avgRerollsCanonical}</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{deltaLabel}</div>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 24px', flex: '1 1 200px', minWidth: 200 }} data-testid="stat-avg-rerolls-ai">
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>Avg Re-rolls — AI Only</div>
          <div style={{ color: '#f87171', fontSize: 28, fontWeight: 700 }}>{data.avgRerollsAi}</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>re-rolls per trip</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>Template Usage Distribution</h3>
          {templateRows.length > 0 ? (
            <SimpleBar data={templateRows.map(([label, value]) => ({ label: String(label), value: Number(value) }))} />
          ) : (
            <div style={{ color: '#64748b' }}>No canonical template trips yet</div>
          )}
        </div>

        <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
          <h3 style={{ color: '#f8fafc', fontSize: 16, marginBottom: 16 }}>City-by-City Breakdown</h3>
          <DataTable
            headers={['City Key', 'Trips Using Canonical Template']}
            rows={templateRows.map(([name, count]) => [String(name), Number(count)])}
          />
        </div>
      </div>
    </div>
  );
}

// ── Family Photos Tab ─────────────────────────────────────────────────────────

const CATEGORIES = ["landmark", "food", "museum", "park", "water", "street"];
const POSE_TEMPLATES_LIST = [
  "classic_memory_shot",
  "group_hug",
  "parent_child_interaction",
  "walk_away_look_back",
  "kid_leading",
  "side_by_side_wander",
];
const ETHNICITIES = [
  "South Asian family", "East Asian family", "Black family", "White family",
  "Hispanic / Latino family", "Middle Eastern family", "diverse families",
  "mixed-race family",
];

interface FamilyPhotoRecord {
  id: string;
  city: string;
  country: string | null;
  place: string | null;
  category: string;
  poseTemplate: string;
  poseType: string;
  familyEthnicity: string | null;
  familyGroupSize: string | null;
  assembledPrompt: string | null;
  imageUrl: string | null;
  status: string;
  isStatic: boolean;
  qualityScore: number | null;
  rejectionReason: string | null;
  createdAt: string;
}

function FamilyPhotosTab({ token }: { token: string }) {
  const [photos, setPhotos] = useState<FamilyPhotoRecord[]>([]);
  const [stats, setStats] = useState<Array<{ status: string; count: number }>>([]);
  const [cityStats, setCityStats] = useState<Array<{ city: string; status: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [genForm, setGenForm] = useState({
    city: '', country: '', place: '',
    category: 'landmark', poseTemplate: 'classic_memory_shot',
    ethnicity: 'South Asian family',
    groupSize: 4, numKids: 1,
  });

  function adminFetch(path: string, opts?: RequestInit) {
    return fetch(path, { ...opts, headers: { 'x-admin-token': token, 'Content-Type': 'application/json', ...(opts?.headers || {}) } });
  }

  function loadPhotos() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterStatus) qs.set('status', filterStatus);
    if (filterCity) qs.set('city', filterCity.toLowerCase().replace(/\s+/g, '-'));
    adminFetch(`/api/admin/family-photos?${qs}`)
      .then(r => r.json())
      .then(d => { setPhotos(d.photos || []); setStats(d.stats || []); setCityStats(d.cityStats || []); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPhotos(); }, [filterStatus, filterCity]);

  async function seedStatic() {
    setSeeding(true); setSeedResult(null);
    try {
      const r = await adminFetch('/api/admin/family-photos/seed-static', { method: 'POST' });
      const d = await r.json();
      setSeedResult(`Inserted: ${d.inserted}, Skipped: ${d.skipped}`);
      loadPhotos();
    } catch { setSeedResult('Seed failed'); }
    finally { setSeeding(false); }
  }

  async function previewAssembledPrompt() {
    try {
      const body = buildGenBody();
      const r = await adminFetch('/api/admin/family-photos/preview-prompt', { method: 'POST', body: JSON.stringify(body) });
      const d = await r.json();
      const warning = d.warnings?.length ? `⚠️ ${d.warnings.join(' ')}\n\n` : '';
      setPreviewPrompt(d.prompt ? `${warning}${d.prompt}` : null);
    } catch { setPreviewPrompt('Error building prompt'); }
  }

  function buildGenBody() {
    return {
      city: genForm.city.trim().toLowerCase().replace(/\s+/g, '-'),
      country: genForm.country || undefined,
      place: genForm.place || undefined,
      category: genForm.category,
      poseTemplate: genForm.poseTemplate,
      family: {
        ethnicity: genForm.ethnicity,
        groupSize: genForm.groupSize,
        adults: [{ role: 'mother', ageRange: '30s' }, { role: 'father', ageRange: '30s' }],
        children: Array.from({ length: Math.min(genForm.numKids, 3) }).map((_, i) => ({
          role: i === 0 ? 'son' : 'daughter',
          age: 6 + i * 2,
        })),
      },
    };
  }

  async function generatePhoto() {
    if (!genForm.city.trim()) { setGenResult('City is required'); return; }
    setGenerating(true); setGenResult(null);
    try {
      const r = await adminFetch('/api/admin/generate-family-photo', { method: 'POST', body: JSON.stringify(buildGenBody()) });
      const d = await r.json();
      if (d.success) {
        const warn = d.warnings?.length ? ` ⚠️ ${d.warnings[0]}` : '';
        setGenResult(`Generated! ID: ${d.id}${warn}`);
        loadPhotos();
      }
      else setGenResult(d.message || 'Generation failed');
    } catch { setGenResult('Network error'); }
    finally { setGenerating(false); }
  }

  async function updatePhoto(id: string, action: 'approve' | 'reject' | 'reset', qualityScore?: number, rejectionReason?: string) {
    if (action === 'approve') {
      await adminFetch(`/api/admin/family-photos/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ qualityScore }),
      });
    } else if (action === 'reject') {
      await adminFetch(`/api/admin/family-photos/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ rejectionReason }),
      });
    } else {
      await adminFetch(`/api/admin/family-photos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, qualityScore, rejectionReason }),
      });
    }
    loadPhotos();
  }

  async function deletePhoto(id: string) {
    if (!confirm('Delete this photo record?')) return;
    await adminFetch(`/api/admin/family-photos/${id}`, { method: 'DELETE' });
    loadPhotos();
  }

  const statusColor: Record<string, string> = {
    approved: '#4ade80',
    rejected: '#f87171',
    pending: '#fbbf24',
    static: '#60a5fa',
  };

  return (
    <div data-testid="family-photos-tab">
      <h2 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 8 }}>Family Photo Library</h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
        AI-generated and static family travel photos for carousel Cards 2 &amp; 3.
      </p>

      {/* Global stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        {stats.map(s => (
          <div key={s.status} style={{ background: '#1e293b', borderRadius: 10, padding: '14px 20px', minWidth: 100 }}>
            <div style={{ color: statusColor[s.status] || '#94a3b8', fontSize: 22, fontWeight: 700 }}>{s.count}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>{s.status}</div>
          </div>
        ))}
      </div>

      {/* Per-city stats table */}
      {cityStats.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 16, marginBottom: 24, overflowX: 'auto' }}>
          <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Photos per City</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Array.from(new Set(cityStats.map(c => c.city))).map(city => {
              const rows = cityStats.filter(c => c.city === city);
              const approved = rows.find(r => r.status === 'approved')?.count ?? 0;
              const pending = rows.find(r => r.status === 'pending')?.count ?? 0;
              const rejected = rows.find(r => r.status === 'rejected')?.count ?? 0;
              return (
                <div key={city} style={{ background: '#0f172a', borderRadius: 8, padding: '8px 12px', minWidth: 120 }}>
                  <div style={{ color: '#f8fafc', fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>{city}</div>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                    {approved > 0 && <span style={{ color: '#4ade80' }}>✓{approved}</span>}
                    {pending > 0 && <span style={{ color: '#fbbf24' }}>⏳{pending}</span>}
                    {rejected > 0 && <span style={{ color: '#f87171' }}>✗{rejected}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seed + generate row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <button
          data-testid="button-seed-static"
          onClick={seedStatic}
          disabled={seeding}
          style={{ padding: '10px 18px', borderRadius: 8, background: '#1d4ed8', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          {seeding ? 'Seeding…' : 'Seed Static Photos'}
        </button>
        {seedResult && <span style={{ color: '#94a3b8', fontSize: 13, alignSelf: 'center' }}>{seedResult}</span>}
      </div>

      {/* Generate form */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 15, marginBottom: 16 }}>Generate New Family Photo (DALL-E 3)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>City *</label>
            <input data-testid="input-gen-city" value={genForm.city} onChange={e => setGenForm(f => ({ ...f, city: e.target.value }))}
              placeholder="e.g. goa" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Country</label>
            <input value={genForm.country} onChange={e => setGenForm(f => ({ ...f, country: e.target.value }))}
              placeholder="e.g. India" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Place</label>
            <input value={genForm.place} onChange={e => setGenForm(f => ({ ...f, place: e.target.value }))}
              placeholder="e.g. Baga Beach" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Category</label>
            <select data-testid="select-gen-category" value={genForm.category} onChange={e => setGenForm(f => ({ ...f, category: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 13 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Pose</label>
            <select value={genForm.poseTemplate} onChange={e => setGenForm(f => ({ ...f, poseTemplate: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 13 }}>
              {POSE_TEMPLATES_LIST.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Family</label>
            <select value={genForm.ethnicity} onChange={e => setGenForm(f => ({ ...f, ethnicity: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 13 }}>
              {ETHNICITIES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Group Size</label>
            <input type="number" min={2} max={6} value={genForm.groupSize} onChange={e => setGenForm(f => ({ ...f, groupSize: Number(e.target.value) }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Num Kids</label>
            <input type="number" min={1} max={3} value={genForm.numKids} onChange={e => setGenForm(f => ({ ...f, numKids: Number(e.target.value) }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: 13 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button data-testid="button-preview-prompt" onClick={previewAssembledPrompt}
            style={{ padding: '9px 16px', borderRadius: 8, background: '#334155', color: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Preview Prompt
          </button>
          <button data-testid="button-generate-photo" onClick={generatePhoto} disabled={generating}
            style={{ padding: '9px 16px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', cursor: generating ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600 }}>
            {generating ? 'Generating…' : 'Generate Photo (costs $0.04)'}
          </button>
          {genResult && <span style={{ color: '#94a3b8', fontSize: 13 }}>{genResult}</span>}
        </div>
        {previewPrompt && (
          <div style={{ marginTop: 14, background: '#0f172a', borderRadius: 8, padding: 14, border: '1px solid #334155' }}>
            <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>ASSEMBLED PROMPT</p>
            <p style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{previewPrompt}</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: 13 }} data-testid="select-filter-status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input value={filterCity} onChange={e => setFilterCity(e.target.value)} placeholder="Filter by city…"
          style={{ padding: '8px 12px', borderRadius: 6, background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: 13, width: 160 }} />
        <button onClick={loadPhotos} style={{ padding: '8px 14px', borderRadius: 6, background: '#334155', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}>
          Refresh
        </button>
      </div>

      {/* Photo list */}
      {loading ? (
        <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {photos.map(photo => (
            <div key={photo.id} data-testid={`photo-card-${photo.id}`}
              style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden', border: `2px solid ${statusColor[photo.status] || '#334155'}20` }}>
              {/* Image */}
              {photo.imageUrl ? (
                <div style={{ position: 'relative', height: 160, background: '#0f172a' }}>
                  <img src={photo.imageUrl} alt={photo.city}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                  <div style={{ position: 'absolute', top: 8, right: 8, background: statusColor[photo.status] || '#334155', color: '#000', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>
                    {photo.status.toUpperCase()}
                  </div>
                  {photo.isStatic && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: '#1e40af', color: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>
                      STATIC
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: 80, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
                  No image yet
                </div>
              )}

              {/* Meta */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <p style={{ color: '#f8fafc', fontWeight: 700, fontSize: 14 }}>{photo.city}{photo.place ? ` — ${photo.place}` : ''}</p>
                    <p style={{ color: '#64748b', fontSize: 12 }}>{photo.category} · {photo.poseTemplate?.replace(/_/g, ' ')}</p>
                  </div>
                  {photo.qualityScore && (
                    <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700 }}>{'★'.repeat(photo.qualityScore)}</div>
                  )}
                </div>
                <p style={{ color: '#475569', fontSize: 11, marginBottom: 10 }}>{photo.familyEthnicity || 'diverse'} · {photo.familyGroupSize || ''}</p>

                {/* Prompt expand */}
                <button onClick={() => setExpandedId(expandedId === photo.id ? null : photo.id)}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 11, cursor: 'pointer', padding: 0, marginBottom: 8 }}>
                  {expandedId === photo.id ? '▲ Hide prompt' : '▼ Show prompt'}
                </button>
                {expandedId === photo.id && photo.assembledPrompt && (
                  <p style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.5, background: '#0f172a', padding: 10, borderRadius: 6, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                    {photo.assembledPrompt}
                  </p>
                )}

                {/* Actions */}
                {!photo.isStatic && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {photo.status !== 'approved' && (
                      <button data-testid={`button-approve-${photo.id}`} onClick={() => updatePhoto(photo.id, 'approve', 4)}
                        style={{ padding: '5px 10px', borderRadius: 6, background: '#065f46', color: '#4ade80', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        Approve ✓
                      </button>
                    )}
                    {photo.status !== 'rejected' && (
                      <button data-testid={`button-reject-${photo.id}`} onClick={() => updatePhoto(photo.id, 'reject', undefined, 'Quality issue')}
                        style={{ padding: '5px 10px', borderRadius: 6, background: '#7f1d1d', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        Reject ✗
                      </button>
                    )}
                    {photo.status !== 'pending' && (
                      <button onClick={() => updatePhoto(photo.id, 'reset')}
                        style={{ padding: '5px 10px', borderRadius: 6, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer', fontSize: 11 }}>
                        Reset
                      </button>
                    )}
                    <button data-testid={`button-delete-${photo.id}`} onClick={() => deletePhoto(photo.id)}
                      style={{ padding: '5px 10px', borderRadius: 6, background: 'transparent', color: '#475569', border: '1px solid #334155', cursor: 'pointer', fontSize: 11 }}>
                      Del
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && photos.length === 0 && (
        <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>
          No photos yet. Click <strong style={{ color: '#f8fafc' }}>Seed Static Photos</strong> to register existing memory images, or generate new ones.
        </div>
      )}
    </div>
  );
}

function GuideSubscribersTab({ token }: { token: string }) {
  const { data, loading, error } = useAdminFetch<any>('/api/admin/guide-subscribers', token);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState('');

  const handleCleanup = async () => {
    if (!window.confirm('Mark all opted-out subscribers\' pending emails as sent? This cannot be undone.')) return;
    setCleaning(true);
    setCleanMsg('');
    try {
      const res = await fetch('/api/admin/guide-subscribers/cleanup', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const d = await res.json();
      setCleanMsg(d.message || 'Done');
    } catch {
      setCleanMsg('Failed to run cleanup');
    }
    setCleaning(false);
  };

  if (loading) return <div style={{ color: '#94a3b8', padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (error || !data) return <div style={{ color: '#ef4444', padding: 40 }}>Failed to load guide subscribers</div>;

  const subscribers: any[] = data.subscribers || [];

  return (
    <div data-testid="guide-subscribers-tab">
      <h2 style={{ color: '#f8fafc', fontSize: 20, marginBottom: 8 }}>Guide Subscribers</h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
        Everyone who signed up for the free guide, with opt-out status.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="Total Subscribers" value={data.total} />
        <StatCard label="Active" value={data.active} sub="still receiving emails" />
        <StatCard label="Opted Out" value={data.optedOut} sub="unsubscribed" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#f8fafc', fontSize: 16, margin: 0 }}>Subscriber List</h3>
        {data.optedOut > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {cleanMsg && <span style={{ color: '#4ade80', fontSize: 13 }}>{cleanMsg}</span>}
            <button
              data-testid="button-cleanup-opted-out"
              onClick={handleCleanup}
              disabled={cleaning}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid #475569',
                background: 'transparent', color: '#f87171', fontSize: 13, cursor: 'pointer',
                opacity: cleaning ? 0.5 : 1,
              }}
            >
              {cleaning ? 'Running…' : 'Remove Opted-Out Pending Emails'}
            </button>
          </div>
        )}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Email', 'Source', 'Subscribed At', 'Confirmation Sent', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No subscribers yet</td>
              </tr>
            ) : subscribers.map((s: any, i: number) => (
              <tr
                key={s.id}
                data-testid={`row-guide-subscriber-${s.id}`}
                style={{ borderBottom: '1px solid #1e293b', background: i % 2 === 0 ? '#0f172a' : '#1e293b' }}
              >
                <td style={{ padding: '10px 16px', color: '#f8fafc' }}>{s.email}</td>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{s.source || '—'}</td>
                <td style={{ padding: '10px 16px', color: '#94a3b8' }}>
                  {s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {s.emailSent
                    ? <span style={{ color: '#4ade80' }}>✓ Sent</span>
                    : <span style={{ color: '#64748b' }}>Pending</span>}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  {s.optedOut
                    ? <span data-testid={`badge-opted-out-${s.id}`} style={{ background: '#450a0a', color: '#f87171', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>Opted Out</span>
                    : <span data-testid={`badge-active-${s.id}`} style={{ background: '#052e16', color: '#4ade80', borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>Active</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatGameType(type: string): string {
  const map: Record<string, string> = {
    guess_and_go: 'Guess & Go',
    daily_quest: 'Daily Quest',
    crossworld: 'CrossWorld',
    find_my_home: 'Find My Home',
    spell_geo: 'Spell Geo',
    map_me: 'Map Me',
    flag_quiz: 'Flag Quiz',
    spin_the_world: 'Spin the World',
  };
  return map[type] || type;
}

export default function AdminDashboard() {
  const { token, isValid, loading, login, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (loading) return <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading...</div>;
  if (!isValid || !token) return <LoginForm onLogin={login} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'geogames', label: 'GeoGames' },
    { id: 'geoadventures', label: 'GeoAdventures' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'users', label: 'Users' },
    { id: 'promo', label: 'Promo Codes' },
    { id: 'canonical', label: 'Canonical Templates' },
    { id: 'photos', label: 'Family Photos' },
    { id: 'guide-subscribers', label: 'Guide Subscribers' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>GeoQuest Admin</h1>
          <nav style={{ display: 'flex', gap: 4 }}>
            {tabs.map(tab => (
              <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : '#94a3b8',
                }}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <button data-testid="button-admin-logout" onClick={logout}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #475569', background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
          Logout
        </button>
      </header>

      <main style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {activeTab === 'overview' && <OverviewTab token={token} />}
        {activeTab === 'geogames' && <GeoGamesTab token={token} />}
        {activeTab === 'geoadventures' && <GeoAdventuresTab token={token} />}
        {activeTab === 'sessions' && <SessionsTab token={token} />}
        {activeTab === 'users' && <UsersTab token={token} />}
        {activeTab === 'promo' && <PromoCodesTab token={token} />}
        {activeTab === 'canonical' && <CanonicalTemplatesTab token={token} />}
        {activeTab === 'photos' && <FamilyPhotosTab token={token} />}
        {activeTab === 'guide-subscribers' && <GuideSubscribersTab token={token} />}
      </main>
    </div>
  );
}
