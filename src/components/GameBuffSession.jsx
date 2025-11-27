import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, X, RotateCcw, Flame } from 'lucide-react';
import { calculateXP, getLevelProgress } from '../utilities/gameLogic';
import BottomNav from './BottomNav';
import { playClick, playTimerComplete } from '../utilities/sounds';

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
  const hasTimerTriggers = loadout?.triggers?.some((t) => t.type === 'timer');

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
  };

  const estimateCalories = (trigger) => {
    const weight = userWeightKg || 75;
    if (trigger.type === 'timer') {
      const seconds = trigger.amount || 0;
      const met = 4; // moderate effort estimate
      return met * weight * (seconds / 3600);
    }
    const reps = trigger.amount || 0;
    const basePerRep = 0.5 * (weight / 75);
    return reps * basePerRep;
  };

  const logSuccess = (trigger) => {
    const gainedXP = calculateXP(trigger.exercise, trigger.amount, trigger.type);
    const gainedCalories = estimateCalories(trigger);
    setSessionXP(prev => prev + gainedXP);
    setSessionCalories(prev => prev + gainedCalories);
    setTotalReps(prev => prev + trigger.amount);
    const entry = {
      time: formatTime(seconds),
      message: `+${gainedXP} XP (${trigger.exercise})`,
      xp: gainedXP,
      amount: trigger.amount,
      type: trigger.type,
      exercise: trigger.exercise,
      calories: gainedCalories
    };
    setLog([entry, ...log]);
    setActiveTimerTrigger(null);
  };

  const handleEndSession = async () => {
    playClick();
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.rpc('finish_session', {
        p_loadout_id: loadout.id, // Updated to use 'loadout.id'
        p_xp_gained: sessionXP,
        p_duration: seconds,
        p_log: log,
        p_calories: sessionCalories
      });
      if (error) throw error;
      navigate(`/game/${loadout.id}`, { state: { loadout } });
    } catch (error) {
      console.error(error);
      alert('Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  const { currentLevel, progressPercent, neededXP, currentXP } = getLevelProgress(userTotalXP + sessionXP);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 font-sans pb-32">
      {hasTimerTriggers && activeTimerTrigger && (
        <TimerModal trigger={activeTimerTrigger} onComplete={logSuccess} onCancel={() => setActiveTimerTrigger(null)} />
      )}
      
      <div className="flex justify-between items-center p-4 bg-slate-800 border-b border-slate-700 shadow-md">
        <div><h2 className="text-xs text-slate-400 uppercase tracking-widest">Current Game</h2><h1 className="text-xl font-bold text-white">{loadout.game_title}</h1></div>
        <div className={`text-2xl font-mono font-bold ${isActive ? 'text-green-400' : 'text-slate-500'}`}>{formatTime(seconds)}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Updated to map over 'loadout.triggers' instead of 'initialLoadout' */}
        {loadout.triggers.map((trigger, idx) => (
          <button key={idx} onClick={() => handleTrigger(trigger)} className={`w-full py-8 rounded-xl shadow-lg transform transition active:scale-95 flex flex-col items-center justify-center ${trigger.color}`}>
            <span className="text-2xl font-black uppercase tracking-wider text-white drop-shadow-md">{trigger.label}</span>
            <span className="text-sm font-medium text-white/90 mt-1 bg-black/20 px-3 py-1 rounded-full">+{trigger.amount} {trigger.exercise}</span>
          </button>
        ))}
      </div>

      <div className="px-4 pb-2 h-8 text-center">{log.length > 0 && <span className="text-slate-400 text-sm animate-pulse">Latest: {log[0].message}</span>}</div>

      <div className="bg-slate-800 p-4 border-t border-slate-700 safe-area-pb">
        <div className="w-full bg-slate-700 h-4 rounded-full mb-4 overflow-hidden relative">
            <div className="bg-yellow-500 h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-black drop-shadow-md">LEVEL {currentLevel} ({Math.floor(currentXP)} / {neededXP} XP)</div>
        </div>
        <div className="flex justify-between items-center mb-4">
           <div className="flex flex-col">
             <span className="text-xs text-slate-400 uppercase">Total Reps</span>
             <span className="text-3xl font-bold text-blue-400">{totalReps}</span>
             <span className="text-xs text-orange-300 flex items-center gap-1 mt-1">
               <Flame size={12} /> ~{Math.round(sessionCalories)} kcal
             </span>
           </div>
           {hasTimerTriggers && (
             <button onClick={() => { playClick(); setIsActive(!isActive); }} className={`p-4 rounded-full ${isActive ? 'bg-yellow-600' : 'bg-green-600'}`}>{isActive ? <Pause size={24} /> : <Play size={24} />}</button>
            )}
         </div>
        <button onClick={handleEndSession} disabled={isSaving} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm font-semibold disabled:opacity-50">{isSaving ? "Saving..." : "End Session & Save"}</button>
      </div>
      <BottomNav />
    </div>
  );
};

export default GameBuffSession;
