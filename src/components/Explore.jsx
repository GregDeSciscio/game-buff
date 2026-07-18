import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Search, Sparkles, Globe2, Loader2, ChevronDown, Timer, Flame, Zap } from 'lucide-react';
import { calculateXP } from '../utilities/gameLogic';
import { calculateCalories } from '../utilities/calories';
import { getExerciseMedia } from '../utilities/exerciseMedia';
import BottomNav from './BottomNav';

const Explore = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('presets');
  const [presets, setPresets] = useState([]);
  const [community, setCommunity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copyingId, setCopyingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [userWeightKg, setUserWeightKg] = useState(75);

  useEffect(() => {
    const fetchWeight = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('weight_kg').eq('id', user.id).single();
      if (data?.weight_kg) setUserWeightKg(data.weight_kg);
    };
    fetchWeight();
  }, []);

  useEffect(() => {
    fetchData();
  }, [tab, search]);

  const fetchData = async () => {
    setLoading(true);
    const term = search.trim();
    if (tab === 'presets') {
      let query = supabase.from('loadouts').select('*').eq('visibility', 'preset').limit(30);
      if (term.length >= 2) query = query.ilike('game_title', `%${term}%`);
      const { data } = await query;
      setPresets(data || []);
    } else {
      let query = supabase
        .from('loadouts')
        .select('*, profiles(display_name, username)')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(30);
      if (term.length >= 2) query = query.ilike('game_title', `%${term}%`);
      const { data } = await query;
      setCommunity(data || []);
    }
    setLoading(false);
  };

  const copyLoadout = async (loadout) => {
    setCopyingId(loadout.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    const payload = {
      user_id: user.id,
      game_title: loadout.game_title,
      triggers: loadout.triggers,
      visibility: 'private',
      source_loadout_id: loadout.id,
    };
    const { error } = await supabase.from('loadouts').insert([payload]);
    setCopyingId(null);
    if (error) {
      alert('Failed to copy loadout');
      console.error(error);
    } else {
      navigate('/dashboard');
    }
  };

  const estimateXP = (trigger) => {
    return calculateXP(trigger.exercise, trigger.amount, trigger.type);
  };

  const renderList = (items, type) => {
    if (loading) return <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="animate-spin" size={14} /> Loading...</div>;
    if (items.length === 0) return <p className="text-sm text-slate-500">No {type} loadouts found.</p>;

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white font-semibold">{item.game_title}</p>
                <p className="text-xs text-slate-500">
                  {type === 'preset' ? 'Preset' : 'Community'} · {item.triggers?.length || 0} triggers
                  {type === 'community' && <> · {item.profiles?.display_name || item.profiles?.username || 'Player'}</>}
                </p>
              </div>
              <div className="flex gap-2">
                {item.triggers?.length ? (
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="text-xs px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 flex items-center gap-1"
                  >
                    <ChevronDown size={12} className={`${expandedId === item.id ? 'rotate-180' : ''} transition`} /> View
                  </button>
                ) : null}
                <button
                  onClick={() => copyLoadout(item)}
                  disabled={copyingId === item.id}
                  className="text-xs px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {copyingId === item.id ? 'Copying...' : 'Use'}
                </button>
              </div>
            </div>
            {expandedId === item.id && item.triggers?.length ? (
              <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
                {item.triggers.map((t, idx) => {
                  const isTimer = t.type === 'timer';
                  const kcal = calculateCalories(t, userWeightKg || 75);
                  const xp = estimateXP(t);
                  return (
                    <div key={idx} className="flex justify-between text-xs text-slate-200 bg-slate-900/60 rounded px-2 py-2">
                      <div className="flex items-center gap-2">
                        {getExerciseMedia(t.exercise) && (
                          <span className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                            <span className="absolute inset-0 bg-gradient-to-br from-emerald-400/70 via-sky-400/70 to-purple-500/70 animate-[spin_3s_linear_infinite] opacity-70" />
                            <span className="absolute inset-1 bg-slate-900/70 rounded-full" />
                          </span>
                        )}
                        <div className="flex flex-col">
                          <span>{t.label || 'Trigger'}</span>
                          <span className="text-[11px] text-slate-500">{t.exercise}</span>
                        </div>
                      </div>
                      <div className="text-right text-slate-400">
                        <span className="block">{t.amount}{isTimer ? 's' : ' reps'}</span>
                        <span className="block flex items-center gap-1 justify-end">
                          <Timer size={10} /> {isTimer ? 'Timer' : 'Reps'}
                        </span>
                        <span className="block flex items-center gap-1 justify-end text-orange-300">
                          <Flame size={10} /> ~{Math.round(kcal)} kcal
                        </span>
                        <span className="block flex items-center gap-1 justify-end text-yellow-300">
                          <Zap size={10} /> ~{Math.round(xp)} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="page-shell min-h-screen p-4 pb-32 text-slate-100 safe-area-pb">
      <div className="screen-header">
        <div className="flex items-center gap-2">
          <Sparkles className="text-violet-300" size={22} />
          <div><p className="eyebrow">Community library</p><h1 className="screen-title">Discover loadouts</h1></div>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by game title"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="segmented-control">
          <button
            onClick={() => setTab('presets')}
            className={`flex-1 text-sm font-semibold ${tab === 'presets' ? 'bg-violet-500/20 text-white' : 'text-slate-400'}`}
          >
            <Sparkles size={14} className="inline mr-1" /> Presets
          </button>
          <button
            onClick={() => setTab('community')}
            className={`flex-1 text-sm font-semibold ${tab === 'community' ? 'bg-violet-500/20 text-white' : 'text-slate-400'}`}
          >
            <Globe2 size={14} className="inline mr-1" /> Community
          </button>
        </div>
      </div>

      {tab === 'presets' ? renderList(presets, 'preset') : renderList(community, 'community')}

      <BottomNav />
    </main>
  );
};

export default Explore;
