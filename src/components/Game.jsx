import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Play, History as HistoryIcon, BarChart2, Trash2, Flame } from 'lucide-react';
import BottomNav from './BottomNav';

const Game = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [loadout, setLoadout] = useState(location.state?.loadout || null);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({ today: 0, yesterday: 0, last7: 0, last30: 0 });
  const [loading, setLoading] = useState(true);
  const [windowFilter, setWindowFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const handleStartSession = () => {
    if (!loadout) return;
    navigate('/session', { state: { loadout } });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const parseLog = (log) => {
    if (Array.isArray(log)) return log;
    if (typeof log === 'string') {
      try {
        const parsed = JSON.parse(log);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const repsFromSession = (session) => {
    const entries = parseLog(session.log_summary);
    return entries.reduce((sum, entry) => {
      const isRep = entry?.type === 'reps';
      const amount = typeof entry?.amount === 'number' ? entry.amount : 0;
      return sum + (isRep ? amount : 0);
    }, 0);
  };

  const aggregateExercises = (session) => {
    const entries = parseLog(session.log_summary);
    const totals = entries.reduce((acc, entry) => {
      if (entry?.type !== 'reps') return acc;
      const exercise = entry.exercise || entry.message?.match(/\(([^)]+)\)/)?.[1] || 'Exercise';
      const amount = typeof entry.amount === 'number' ? entry.amount : 0;
      acc[exercise] = (acc[exercise] || 0) + amount;
      return acc;
    }, {});
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  };

  const computeStats = (sessionList) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const last7Start = new Date(todayStart);
    last7Start.setDate(last7Start.getDate() - 6); // includes today
    const last30Start = new Date(todayStart);
    last30Start.setDate(last30Start.getDate() - 29); // includes today

    const sumRange = (start, end) =>
      sessionList.reduce((sum, session) => {
        const played = new Date(session.played_at);
        if (start && played < start) return sum;
        if (end && played >= end) return sum;
        return sum + repsFromSession(session);
      }, 0);

    setStats({
      today: sumRange(todayStart, null),
      yesterday: sumRange(yesterdayStart, todayStart),
      last7: sumRange(last7Start, null),
      last30: sumRange(last30Start, null),
      topToday: aggregateExercisesForRange(sessionList, todayStart, null),
      top7: aggregateExercisesForRange(sessionList, last7Start, null),
    });
  };

  const aggregateExercisesForRange = (sessionList, start, end) => {
    const totals = {};
    sessionList.forEach((session) => {
      const played = new Date(session.played_at);
      if (start && played < start) return;
      if (end && played >= end) return;
      const entries = parseLog(session.log_summary);
      entries.forEach((entry) => {
        if (entry?.type !== 'reps') return;
        const exercise = entry.exercise || entry.message?.match(/\(([^)]+)\)/)?.[1] || 'Exercise';
        const amount = typeof entry.amount === 'number' ? entry.amount : 0;
        totals[exercise] = (totals[exercise] || 0) + amount;
      });
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 4);
  };

  const handleDelete = async (session) => {
    const confirmed = window.confirm(
      'Delete this session? This will remove the XP gained from your profile. This cannot be undone.'
    );
    if (!confirmed) return;

    setDeletingId(session.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase.from('sessions').delete().eq('id', session.id);
      if (deleteError) throw deleteError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      const currentXp = profileData?.total_xp || 0;
      const newXp = Math.max(0, currentXp - (session.total_xp_gained || 0));

      const { error: xpError } = await supabase
        .from('profiles')
        .update({ total_xp: newXp })
        .eq('id', user.id);
      if (xpError) throw xpError;

      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== session.id);
        computeStats(next);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete session', error);
      alert('Failed to delete session. It may still exist and XP was not adjusted.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllSessions = async () => {
    if (!sessions.length) {
      alert('No sessions to delete for this game.');
      return;
    }
    const confirmed = window.confirm(
      'Delete ALL sessions for this game? This will remove all XP gained from them and cannot be undone.'
    );
    if (!confirmed) return;

    setDeletingAll(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const totalXpToRemove = sessions.reduce((sum, s) => sum + (s.total_xp_gained || 0), 0);

      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('loadout_id', id);
      if (deleteError) throw deleteError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      const currentXp = profileData?.total_xp || 0;
      const newXp = Math.max(0, currentXp - totalXpToRemove);

      const { error: xpError } = await supabase
        .from('profiles')
        .update({ total_xp: newXp })
        .eq('id', user.id);
      if (xpError) throw xpError;

      setSessions([]);
      computeStats([]);
    } catch (error) {
      console.error('Failed to delete all sessions', error);
      alert('Failed to delete all sessions. XP was not adjusted.');
    } finally {
      setDeletingAll(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return navigate('/login');

    const { data: loadoutData } = await supabase.from('loadouts').select('*').eq('id', id).single();
    if (loadoutData) setLoadout(loadoutData);

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id, total_xp_gained, duration_seconds, log_summary, played_at')
      .eq('user_id', user.id)
      .eq('loadout_id', id)
      .order('played_at', { ascending: false })
      .limit(50);

    const list = sessionData || [];
    setSessions(list);
    computeStats(list);
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredSessions = sessions.filter((session) => {
    if (windowFilter === 'all') return true;
    const days = windowFilter === '7' ? 7 : 30;
    const start = startOfDay(new Date());
    start.setDate(start.getDate() - (days - 1));
    return new Date(session.played_at) >= start;
  });

  const recentSessions = filteredSessions.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-32 safe-area-pb">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <BarChart2 className="text-blue-400" size={22} />
          <h1 className="text-xl font-bold">{loadout?.game_title || 'Game'}</h1>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 mt-16">Loading activity...</div>
      ) : (
        <>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase">Triggers</p>
                <p className="text-lg font-semibold text-white">{loadout?.triggers?.length || 0} available</p>
              </div>
              <button
                onClick={handleStartSession}
                disabled={!loadout}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-4 py-2 rounded-lg shadow-lg shadow-green-900/30 transition"
              >
                <Play size={18} /> Start Session
              </button>
            </div>

            {loadout?.triggers?.length ? (
              <div className="flex flex-wrap gap-2">
                {loadout.triggers.map((trigger, idx) => (
                  <span
                    key={trigger.id || idx}
                    className={`text-xs px-3 py-2 rounded-full border border-slate-700 ${trigger.color} text-white shadow-sm`}
                  >
                    {trigger.label || 'Trigger'} · {trigger.amount}
                    {trigger.type === 'timer' ? 's' : ' reps'} {trigger.exercise}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No triggers found for this game.</p>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={18} className="text-blue-400" />
              <h2 className="text-lg font-semibold">Recent Activity</h2>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-slate-300 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Window</th>
                    <th className="px-4 py-3 text-right">Reps</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-800">
                    <td className="px-4 py-3 text-slate-300">Today</td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{stats.today}</td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="px-4 py-3 text-slate-300">Yesterday</td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{stats.yesterday}</td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="px-4 py-3 text-slate-300">Last 7 Days</td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{stats.last7}</td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="px-4 py-3 text-slate-300">Last 30 Days</td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{stats.last30}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <p className="text-xs uppercase text-slate-400 mb-2">Top Exercises Today</p>
                {stats.topToday?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.topToday.map(([exercise, reps]) => (
                      <span key={exercise} className="text-[11px] text-slate-100 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                        {exercise}: {reps} reps
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No reps logged today.</p>
                )}
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <p className="text-xs uppercase text-slate-400 mb-2">Top Exercises (Last 7 Days)</p>
                {stats.top7?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {stats.top7.map(([exercise, reps]) => (
                      <span key={exercise} className="text-[11px] text-slate-100 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                        {exercise}: {reps} reps
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No reps logged last 7 days.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white">Recent Sessions</h3>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-900 rounded-full border border-slate-700 p-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: '7', label: '7d' },
                    { id: '30', label: '30d' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setWindowFilter(option.id)}
                      className={`px-3 py-1 text-xs rounded-full transition ${
                        windowFilter === option.id ? 'bg-blue-600 text-white' : 'text-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleDeleteAllSessions}
                  disabled={deletingAll || !sessions.length}
                  className="text-xs px-3 py-2 rounded-lg border border-red-500 text-red-300 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                  title="Deletes all sessions for this game and removes the XP gained"
                >
                  {deletingAll ? 'Deleting All...' : 'Delete All'}
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <HistoryIcon size={14} /> Full History
                </button>
              </div>
            </div>

            {recentSessions.length === 0 ? (
              <p className="text-sm text-slate-400">No sessions logged yet.</p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => {
                  const exerciseSummary = aggregateExercises(session);
                  return (
                    <div
                      key={session.id}
                      className="flex justify-between items-start bg-slate-900/70 rounded-lg px-3 py-2 border border-slate-800"
                    >
                      <div>
                        <p className="text-sm text-white font-semibold">+{session.total_xp_gained} XP</p>
                        <p className="text-xs text-slate-400">{formatDate(session.played_at)}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {exerciseSummary.length > 0 ? (
                            exerciseSummary.slice(0, 3).map(([exercise, amount]) => (
                              <span
                                key={exercise}
                                className="text-[11px] text-slate-200 bg-slate-800 px-2 py-1 rounded-full border border-slate-700"
                              >
                                {exercise}: {amount} reps
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500">No rep breakdown</span>
                          )}
                        </div>
                      </div>
                    <div className="text-right text-xs text-slate-400 flex flex-col items-end gap-2">
                      <div className="text-right">
                        <span className="block">
                          {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                        </span>
                        <span className="block">{repsFromSession(session)} reps</span>
                        {session.calories_burned !== null && session.calories_burned !== undefined && (
                          <span className="block text-orange-300 flex items-center gap-1 justify-end">
                            <Flame size={12} /> ~{Math.round(session.calories_burned)} kcal
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(session)}
                        disabled={deletingId === session.id}
                        className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-lg border border-red-500 text-red-300 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                          title="Deletes the session and removes the XP gained"
                        >
                          <Trash2 size={14} />
                          {deletingId === session.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      <BottomNav />
    </div>
  );
};

export default Game;
