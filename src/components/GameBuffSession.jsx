import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, X, RotateCcw } from 'lucide-react';
import { calculateXP, getLevelProgress } from '../utilities/gameLogic';
import { calculateCalories } from '../utilities/calories';
import BottomNav from './BottomNav';
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

  const buttonItems = [
    ...sessionBaseExercises.map((exercise) => ({
      id: `base-${exercise.name}`,
      title: exercise.name,
      subtitle: `+${exercise.reps} reps`,
      detail: exercise.weight !== undefined ? `Weight: ${exercise.weight} lbs` : null,
      onClick: () => handleBaseExercise(exercise),
      variant: 'base',
    })),
    ...(loadout?.triggers || []).map((trigger, idx) => ({
      id: `trigger-${trigger.id || idx}`,
      title: trigger.label || trigger.exercise,
      subtitle: `+${trigger.amount} ${trigger.exercise}`,
      color: trigger.color,
      onClick: () => handleTrigger(trigger),
      variant: 'trigger',
    })),
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans pb-[280px]">
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
      
      <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700 shadow-md">
        <div><h2 className="text-xs text-slate-400 uppercase tracking-widest">Current Game</h2><h1 className="text-xl font-bold text-white">{loadout.game_title}</h1></div>
        <div className={`text-2xl font-mono font-bold ${isActive ? 'text-green-400' : 'text-slate-500'}`}>{formatTime(seconds)}</div>
      </div>
      <div className="px-4">
        {log[0] && (
          <p className="text-xs text-slate-400 mb-2">Latest: {log[0].message}</p>
        )}
      </div>
      <div className="flex-1 overflow-hidden px-4">
        <div className="h-full overflow-y-auto space-y-4 pb-6 pt-2">
          {buttonItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`w-full rounded-3xl border border-slate-800 shadow-2xl shadow-black/40 transform transition active:scale-95 flex flex-col justify-center gap-2 px-6 ${
                item.variant === 'trigger'
                  ? `py-8 ${item.color} text-white`
                  : 'py-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white'
              }`}
            >
              <p className="text-3xl font-black uppercase tracking-[0.25em]">{item.title}</p>
              <p className="text-lg font-semibold">{item.subtitle}</p>
              {item.detail && <p className="text-sm font-semibold text-amber-300">{item.detail}</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-16 px-4 pb-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-700 p-4 shadow-2xl">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Level</p>
              <p className="text-sm text-white font-semibold">
                LEVEL {currentLevel} ({Math.floor(currentXP)} / {neededXP} XP)
              </p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Total Reps</p>
              <p className="text-lg font-bold text-blue-400">{totalReps}</p>
            </div>
            {hasTimerTriggers && (
              <button
                onClick={() => {
                  playClick();
                  setIsActive(!isActive);
                }}
                className={`px-4 py-2 text-xs font-semibold uppercase rounded-full ${isActive ? 'bg-yellow-600 text-slate-900' : 'bg-green-600 text-slate-900'}`}
              >
                {isActive ? 'Pause Timer' : 'Start Timer'}
              </button>
            )}
          </div>
          <div className="relative mb-3">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full bg-yellow-500 transition-all duration-500 ease-out ${levelPulse ? 'animate-pulse' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 text-center">~{Math.round(sessionCalories)} kcal</p>
          </div>
          <button
            onClick={handleEndSession}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 via-lime-400 to-blue-500 text-slate-900 font-bold text-lg uppercase rounded-2xl shadow-lg shadow-emerald-500/40 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'End Session & Save'}
          </button>
        </div>
      </div>
      {unlockedBadges.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 border border-emerald-500 rounded-lg px-4 py-2 text-xs text-emerald-100 shadow-lg shadow-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="text-emerald-300">New Badge</span>
            <span className="font-semibold">{badgeLabels[unlockedBadges[0]] || unlockedBadges[0]}</span>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  );
};

export default GameBuffSession;
