import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, X, RotateCcw, Undo2, Flame, Zap } from 'lucide-react';
import { calculateXP, getLevelProgress } from '../utilities/gameLogic';
import { calculateCalories } from '../utilities/calories';
import { playClick, playTimerComplete } from '../utilities/sounds';
import { buildBaseExerciseState } from '../utilities/baseExercises';

const TimerModal = ({ trigger, onComplete, onCancel }) => {
  const [timeLeft, setTimeLeft] = useState(trigger.amount);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    if (timeLeft === 0) {
      playTimerComplete();
      onComplete(trigger);
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isPaused, onComplete, trigger]);

  const progress = ((trigger.amount - timeLeft) / trigger.amount) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
      <h2 className="text-3xl font-bold text-white mb-8 text-center animate-bounce-slight">{trigger.exercise}</h2>
      <div className="relative w-64 h-64 flex items-center justify-center rounded-full border-8 border-slate-700 mb-8">
        <div className="absolute inset-0 rounded-full border-8 border-green-500 transition-all duration-1000 ease-linear" style={{ clipPath: `inset(0 0 ${100 - progress}% 0)` }} />
        <span className="text-8xl font-mono font-black text-white relative z-10">{timeLeft}</span>
      </div>
      <div className="flex gap-6">
        <button onClick={() => { playClick(); onCancel(); }} className="p-4 rounded-full bg-slate-700 text-slate-300 hover:bg-red-900"><X size={32} /></button>
        <button onClick={() => { playClick(); setIsPaused(!isPaused); }} className="p-4 rounded-full bg-blue-600 text-white">{isPaused ? <Play size={32} /> : <Pause size={32} />}</button>
        <button onClick={() => { playClick(); setTimeLeft(trigger.amount); }} className="p-4 rounded-full bg-slate-700 text-slate-300"><RotateCcw size={32} /></button>
      </div>
    </div>
  );
};

const GameBuffSession = ({ initialLoadout }) => {
  const navigate = useNavigate();
  // Use local state for loadout so we can update it with fresh DB data
  const [loadout, setLoadout] = useState(initialLoadout);
  
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionCalories, setSessionCalories] = useState(0);
  const [userTotalXP, setUserTotalXP] = useState(0);
  const [userWeightKg, setUserWeightKg] = useState(null);
  const [log, setLog] = useState([]);
  const [activeTimerTrigger, setActiveTimerTrigger] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [burst, setBurst] = useState(false);
  const [levelPulse, setLevelPulse] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const badgeLabels = {
    sessions_10: '10 Sessions',
    sessions_25: '25 Sessions',
    sessions_50: '50 Sessions',
    streak_7: '7-Day Streak',
  };
  const hasTimerTriggers = loadout?.triggers?.some((t) => t.type === 'timer');
  const sessionBaseExercises = React.useMemo(
    () => buildBaseExerciseState(loadout?.base_exercises || []),
    [loadout?.base_exercises]
  );

  const handleBaseExercise = (exercise) => {
    handleTrigger({
      exercise: exercise.name,
      amount: exercise.reps,
      type: 'reps',
      weight: exercise.weight,
      label: exercise.name,
    });
  };

  // 1. NEW: Fetch the latest version of this loadout immediately
  useEffect(() => {
    const fetchFreshLoadout = async () => {
      const { data, error } = await supabase
        .from('loadouts')
        .select('*')
        .eq('id', initialLoadout.id)
        .single();
      
      if (data && !error) {
        setLoadout(data);
      }
    };
    fetchFreshLoadout();
  }, [initialLoadout.id]);

  // 2. Existing XP Fetch
  useEffect(() => {
    const fetchXP = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('total_xp, weight_kg').eq('id', user.id).single();
            if (data) {
              setUserTotalXP(data.total_xp);
              setUserWeightKg(data.weight_kg || null);
            }
        }
    };
    fetchXP();
  }, []);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (!isActive && seconds !== 0) clearInterval(interval);
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTrigger = (trigger) => {
    playClick();
    if (!isActive) setIsActive(true);
    if (trigger.type === 'timer') {
      setActiveTimerTrigger(trigger);
    } else {
      logSuccess(trigger);
    }
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  };

  const logSuccess = (trigger) => {
    const gainedXP = calculateXP(trigger.exercise, trigger.amount, trigger.type);
    const gainedCalories = calculateCalories(trigger, userWeightKg || 75);
    setSessionXP(prev => prev + gainedXP);
    setSessionCalories(prev => prev + gainedCalories);
    setTotalReps(prev => prev + trigger.amount);
    const entry = {
      time: formatTime(seconds),
      message: `+${gainedXP} XP (${trigger.exercise}${trigger.weight ? ` @ ${trigger.weight} lbs` : ''}) · ~${Math.round(gainedCalories)} kcal`,
      xp: gainedXP,
      amount: trigger.amount,
      type: trigger.type,
      exercise: trigger.exercise,
      weight: trigger.weight,
      calories: gainedCalories
    };
    setLog((prev) => [entry, ...prev]);
    setActiveTimerTrigger(null);
  };

  const handleUndo = () => {
    const latest = log[0];
    if (!latest) return;
    playClick();
    setSessionXP((value) => Math.max(0, value - (latest.xp || 0)));
    setSessionCalories((value) => Math.max(0, value - (latest.calories || 0)));
    setTotalReps((value) => Math.max(0, value - (latest.amount || 0)));
    setLog((entries) => entries.slice(1));
  };

  const leaveWithoutSaving = () => {
    playClick();
    navigate(`/game/${loadout.id}`, { state: { loadout } });
  };

  const handleEndSession = async () => {
    playClick();
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.rpc('finish_session', {
        p_loadout_id: loadout.id, // Updated to use 'loadout.id'
        p_xp_gained: sessionXP,
        p_duration: seconds,
        p_log: log,
        p_calories: sessionCalories
      });
      if (error) throw error;
      if (data?.unlocked_badges && Array.isArray(data.unlocked_badges)) {
        setUnlockedBadges(data.unlocked_badges);
        setTimeout(() => setUnlockedBadges([]), 4000);
      }
      navigate(`/game/${loadout.id}`, { state: { loadout } });
    } catch (error) {
      console.error(error);
      alert('Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  const { currentLevel, progressPercent, neededXP, currentXP } = getLevelProgress(userTotalXP + sessionXP);
  const prevLevelRef = React.useRef(currentLevel);
  useEffect(() => {
    if (currentLevel > prevLevelRef.current) {
      setLevelPulse(true);
      setTimeout(() => setLevelPulse(false), 1000);
    }
    prevLevelRef.current = currentLevel;
  }, [currentLevel]);

  const baseButtons = sessionBaseExercises.map((exercise) => ({
    id: `base-${exercise.name}`,
    title: exercise.name,
    subtitle: `+${exercise.reps} reps`,
    detail: exercise.weight !== undefined ? `Weight: ${exercise.weight} lbs` : null,
    onClick: () => handleBaseExercise(exercise),
    variant: 'base',
  }));
  const triggerButtons = (loadout?.triggers || []).map((trigger, idx) => ({
    id: `trigger-${trigger.id || idx}`,
    title: trigger.label || trigger.exercise,
    subtitle: `+${trigger.amount} ${trigger.exercise}`,
    color: trigger.color,
    onClick: () => handleTrigger(trigger),
    variant: 'trigger',
  }));
  const buttonItems = [...triggerButtons, ...baseButtons];

  return (
    <main className="page-shell flex h-screen flex-col overflow-hidden pb-[218px] text-slate-100">
      {hasTimerTriggers && activeTimerTrigger && (
        <TimerModal trigger={activeTimerTrigger} onComplete={logSuccess} onCancel={() => setActiveTimerTrigger(null)} />
      )}
      {burst && (
        <div className="pointer-events-none fixed inset-0 z-40">
          <div className="absolute inset-0 animate-[fade_0.7s_ease-out] bg-gradient-to-br from-transparent via-white/10 to-transparent" />
          <div className="absolute inset-0 flex flex-wrap opacity-70 animate-[fade_0.7s_ease-out]">
            {[...Array(12)].map((_, i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-emerald-300"
                style={{ transform: `translate(${(i % 4) * 80}px, ${Math.floor(i / 4) * 80}px)` }}
              />
            ))}
          </div>
        </div>
      )}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center">
          <div className="surface-card w-full max-w-md p-5">
            <p className="eyebrow">Leave the arena?</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">This session will not be saved.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Your {totalReps} logged reps and {sessionXP} XP will be discarded.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowExitConfirm(false)} className="min-h-12 rounded-xl border border-white/10 bg-slate-800 px-4 font-bold text-white">Keep training</button>
              <button type="button" onClick={leaveWithoutSaving} className="min-h-12 rounded-xl border border-red-400/30 bg-red-500/15 px-4 font-bold text-red-200">Leave session</button>
            </div>
          </div>
        </div>
      )}

      <header className="relative flex items-center justify-between border-b border-white/10 bg-[#0b1120]/85 px-4 py-4 backdrop-blur-xl">
        <button type="button" onClick={() => log.length ? setShowExitConfirm(true) : leaveWithoutSaving()} className="icon-button" aria-label="Exit session"><X size={19} /></button>
        <div className="min-w-0 flex-1 px-3"><p className="eyebrow">Live session</p><h1 className="truncate text-lg font-extrabold text-white">{loadout.game_title}</h1></div>
        <div className={`rounded-xl border px-3 py-2 font-mono text-lg font-bold ${isActive ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-slate-400'}`}>{formatTime(seconds)}</div>
      </header>

      <div className="relative flex items-center justify-between gap-3 px-4 pb-2 pt-4">
        <div><p className="eyebrow">Tap what happened</p><p className="mt-1 text-sm text-slate-400">Your first tap starts the clock.</p></div>
        {log[0] && <button type="button" onClick={handleUndo} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-slate-800/80 px-3 text-sm font-bold text-slate-200"><Undo2 size={16} /> Undo</button>}
      </div>
      {log[0] && <p className="relative mx-4 mb-1 truncate rounded-lg bg-emerald-400/5 px-3 py-2 text-xs text-emerald-200">Latest · {log[0].message}</p>}
      <div className="relative flex-1 overflow-hidden px-4">
        <div className="grid h-full grid-cols-2 gap-3 overflow-y-auto pb-6 pt-2 md:grid-cols-3">
          {buttonItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex min-h-[112px] w-full transform flex-col items-center justify-center gap-1 rounded-2xl border px-3 py-4 text-center shadow-xl shadow-black/25 transition active:scale-95 ${
                  item.variant === 'trigger'
              ? `${item.color} border-white/15 text-white`
              : 'border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white'
                }`}
              >
                <p className="text-lg font-black uppercase tracking-wide">{item.title}</p>
                <div className="flex flex-col items-center justify-center gap-1 text-sm font-semibold text-white/80">
                  <span>{item.subtitle}</span>
                  {item.detail && <span className="text-xs font-semibold text-amber-200">{item.detail}</span>}
                </div>
              </button>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 p-3 safe-area-pb">
        <div className="surface-card mx-auto max-w-2xl p-3 shadow-2xl shadow-black/50">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/5 px-3 py-2"><p className="eyebrow">XP</p><p className="mt-1 flex items-center gap-1 text-lg font-extrabold text-violet-200"><Zap size={15} /> {sessionXP}</p></div>
            <div className="rounded-xl bg-white/5 px-3 py-2"><p className="eyebrow">Reps</p><p className="mt-1 text-lg font-extrabold text-cyan-200">{totalReps}</p></div>
            <div className="rounded-xl bg-white/5 px-3 py-2"><p className="eyebrow">Energy</p><p className="mt-1 flex items-center gap-1 text-lg font-extrabold text-amber-200"><Flame size={15} /> {Math.round(sessionCalories)}</p></div>
          </div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex-1"><div className="mb-1 flex justify-between text-xs text-slate-400"><span>Level {currentLevel}</span><span>{Math.floor(currentXP)} / {neededXP} XP</span></div><div className="progress-track h-2 rounded-full"><div className={`progress-fill h-full rounded-full transition-all ${levelPulse ? 'animate-pulse' : ''}`} style={{ width: `${progressPercent}%` }} /></div></div>
            {hasTimerTriggers && (
              <button
                onClick={() => {
                  playClick();
                  setIsActive(!isActive);
                }}
                className={`min-h-11 rounded-xl px-3 text-xs font-bold uppercase ${isActive ? 'bg-amber-400/15 text-amber-200' : 'bg-emerald-400/15 text-emerald-200'}`}
              >
                {isActive ? 'Pause' : 'Start'}
              </button>
            )}
          </div>
          <button
            onClick={handleEndSession}
            disabled={isSaving}
            className="neon-button w-full rounded-xl px-4 py-3.5 text-base font-extrabold disabled:opacity-60"
          >
            {isSaving ? 'Saving session…' : 'Finish & save session'}
          </button>
        </div>
      </div>
      {unlockedBadges.length > 0 && (
        <div className="fixed bottom-56 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-emerald-400/30 bg-slate-900 px-4 py-3 text-sm text-emerald-100 shadow-lg shadow-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-emerald-300">New Badge</span>
            <span className="font-semibold">{badgeLabels[unlockedBadges[0]] || unlockedBadges[0]}</span>
          </div>
        </div>
      )}
    </main>
  );
};

export default GameBuffSession;
