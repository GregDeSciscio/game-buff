import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Plus, Play, Trophy, LogOut, Pencil, User, Users, Eye, Globe2, Lock, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { getLevelProgress } from '../utilities/gameLogic';
import BottomNav from './BottomNav';
import StreaksBadges from './StreaksBadges';

const gameGradients = [
  'from-violet-500/35 via-indigo-500/16 to-transparent',
  'from-cyan-500/30 via-blue-500/12 to-transparent',
  'from-fuchsia-500/30 via-violet-500/12 to-transparent',
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loadouts, setLoadouts] = useState([]);

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: loadoutsData } = await supabase.from('loadouts').select('*').eq('user_id', user.id).neq('visibility', 'preset');
    setProfile(profileData); setLoadouts(loadoutsData || []); setLoading(false);
  };
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };
  if (loading) return <div className="page-shell grid min-h-screen place-items-center"><div className="eyebrow animate-pulse">Synchronizing player profile</div></div>;
  const { currentLevel, progressPercent, neededXP, currentXP } = getLevelProgress(profile?.total_xp || 0);
  const playerName = profile?.display_name || profile?.username || 'Player One';
  const lastLoadoutId = window.localStorage.getItem('game-buff:last-loadout');
  const preferredLoadout = loadouts.find((loadout) => String(loadout.id) === lastLoadoutId) || loadouts[0];
  const launchLoadout = (loadout) => {
    if (!loadout) return navigate('/create');
    window.localStorage.setItem('game-buff:last-loadout', String(loadout.id));
    navigate('/session', { state: { loadout } });
  };

  return (
    <main className="page-shell pb-28 safe-area-pb">
      <div className="orbit -right-48 -top-36" /><div className="orbit -right-28 -top-20 scale-75" />
      <div className="app-container px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-300/30 bg-gradient-to-br from-violet-400 to-indigo-600 shadow-lg shadow-indigo-900/40"><Zap size={21} fill="currentColor" /></div>
            <div><p className="eyebrow">Game Buff</p><h1 className="text-xl font-extrabold tracking-tight text-white">Your command center</h1></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/friends')} className="icon-button" title="Friends" aria-label="Open friends"><Users size={18} /></button>
            <button onClick={() => navigate('/profile')} className="icon-button" title="Profile" aria-label="Open profile"><User size={18} /></button>
            <button onClick={handleLogout} className="icon-button hidden sm:inline-flex" title="Log out" aria-label="Log out"><LogOut size={18} /></button>
          </div>
        </header>

        <section className="glass-panel relative mb-5 overflow-hidden rounded-[1.65rem] p-5 sm:p-7">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-violet-500/25 blur-3xl" />
          <div className="relative grid items-end gap-6 md:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="eyebrow mb-2">Welcome back, {playerName}</p>
              <div className="flex items-center gap-3"><span className="text-5xl font-black leading-none tracking-tighter text-white sm:text-6xl">{currentLevel}</span><div><p className="text-lg font-bold text-violet-200">LEVEL UP</p><p className="text-sm text-slate-400">You’re building momentum.</p></div></div>
              <div className="mt-6 max-w-xl"><div className="mb-2 flex justify-between text-xs font-semibold text-slate-400"><span>XP TO NEXT LEVEL</span><span className="font-mono text-violet-200">{Math.floor(currentXP)} / {neededXP}</span></div><div className="progress-track h-3 rounded-full p-[2px]"><div className="progress-fill h-full rounded-full" style={{ width: `${Math.max(3, progressPercent)}%` }} /></div></div>
            </div>
            <div className="rounded-2xl border border-violet-300/20 bg-black/25 p-4 shadow-xl shadow-black/10 sm:p-5">
              <div className="mb-3 flex items-center justify-between"><span className="eyebrow">Ready when you are</span><Trophy className="text-amber-300" size={19} /></div>
              <p className="text-xl font-extrabold text-white">{preferredLoadout?.game_title || 'Build your first loadout'}</p>
              <p className="mt-1 text-sm leading-5 text-slate-400">{preferredLoadout ? `${preferredLoadout.triggers?.length || 0} triggers are armed for this session.` : 'Connect game moments to exercises and start earning XP.'}</p>
              <button onClick={() => launchLoadout(preferredLoadout)} className="neon-button mt-4 min-h-12 w-full rounded-xl px-4 text-sm font-bold">{preferredLoadout ? <><Play size={16} fill="currentColor" /> Start session</> : <><Plus size={16} /> Build a loadout</>}</button>
            </div>
          </div>
        </section>

        <div className="mb-7 grid gap-4 md:grid-cols-2"><StreaksBadges /><div className="glass-panel rounded-2xl p-5"><div className="flex h-full items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300"><Sparkles size={22} /></div><div><p className="eyebrow">Your arena</p><p className="mt-1 text-lg font-bold text-white">{loadouts.length} {loadouts.length === 1 ? 'loadout' : 'loadouts'} ready</p><p className="text-sm text-slate-400">Tune your triggers, then hit play.</p></div></div></div></div>

        <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Loadout library</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white">Your games</h2></div><button onClick={() => navigate('/create')} className="hidden items-center gap-1 text-sm font-semibold text-violet-300 hover:text-white sm:flex">New loadout <ChevronRight size={16} /></button></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loadouts.map((loadout, index) => {
              const visibility = loadout.visibility === 'public' ? <><Globe2 size={12} /> Shared</> : <><Lock size={12} /> Private</>;
              return <article key={loadout.id} className="glass-panel group relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-300/35">
                <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${gameGradients[index % gameGradients.length]}`} /><div className="relative"><div className="mb-10 flex items-start justify-between"><span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/30 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">{visibility}</span><button onClick={() => navigate(`/edit/${loadout.id}`)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-slate-950/30 text-slate-300 opacity-100 transition hover:text-white sm:opacity-0 sm:group-hover:opacity-100" title="Edit loadout" aria-label={`Edit ${loadout.game_title}`}><Pencil size={16} /></button></div><h3 className="text-xl font-bold text-white">{loadout.game_title}</h3><p className="mt-1 text-sm text-slate-400">{loadout.triggers?.length || 0} configured triggers{preferredLoadout?.id === loadout.id ? ' · Ready for quick start' : ''}</p><div className="mt-5 flex gap-2"><button onClick={() => navigate(`/game/${loadout.id}`, { state: { loadout } })} className="icon-button h-12 w-12 rounded-xl" title="View loadout" aria-label={`View ${loadout.game_title}`}><Eye size={17} /></button><button onClick={() => launchLoadout(loadout)} className="neon-button min-h-12 flex-1 rounded-xl px-3 text-sm font-bold"><Play size={15} fill="currentColor" /> Start session</button></div></div></article>;
            })}
            <button onClick={() => navigate('/create')} className="group flex min-h-[225px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600/50 bg-slate-900/25 p-5 text-slate-400 transition hover:border-violet-400/70 hover:bg-violet-500/10 hover:text-white"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-slate-600/50 bg-slate-800/60 transition group-hover:scale-110 group-hover:border-violet-300/50 group-hover:bg-violet-500/20"><Plus size={22} /></span><span className="font-bold">Create a loadout</span><span className="mt-1 text-xs text-slate-500">Make the game work out with you</span></button>
          </div>
        </section>
      </div>
      <BottomNav />
    </main>
  );
};

export default Dashboard;
