import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Trophy, Clock, Flame } from 'lucide-react';
import BottomNav from './BottomNav';

const History = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch sessions AND the related game_title from the 'loadouts' table
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        loadouts ( game_title )
      `)
      .eq('user_id', user.id)
      .order('played_at', { ascending: false }); // Newest first

    if (error) console.error('Error fetching history:', error);
    else setSessions(data || []);
    
    setLoading(false);
  };

  const handleDelete = async (session) => {
    const confirmed = window.confirm('Delete this session? This will remove the XP gained from your profile. This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(session.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', session.id);
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

      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch (error) {
      console.error('Failed to delete session', error);
      alert('Failed to delete session. It may still exist and XP was not adjusted.');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to format date nicely
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
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

  return (
    <main className="page-shell min-h-screen p-4 pb-32 text-slate-100 safe-area-pb">
      
      {/* Header */}
      <div className="screen-header">
        <button onClick={() => navigate('/dashboard')} className="icon-button" aria-label="Back to arena">
          <ArrowLeft size={20} />
        </button>
        <div><p className="eyebrow">Your progress</p><h1 className="screen-title">Session activity</h1></div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 mt-10">Loading stats...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-slate-500 mt-10 p-8 border-2 border-dashed border-slate-800 rounded-xl">
          <p>No sessions yet.</p>
          <p className="text-sm mt-2">Go play some games!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
              <div key={session.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-white text-lg">
                      {session.loadouts?.game_title || 'Unknown Game'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <Calendar size={12} /> {formatDate(session.played_at)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-green-400 font-bold text-lg">+{session.total_xp_gained} XP</span>
                </div>
                </div>
                
              {/* Stats Row */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700/50 items-center justify-between flex-wrap">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-blue-400" /> 
                    {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                  </span>
                  {session.calories_burned !== null && session.calories_burned !== undefined && (
                    <span className="flex items-center gap-1 text-orange-300">
                      <Flame size={14} /> ~{Math.round(session.calories_burned)} kcal
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                  {parseLog(session.log_summary).slice(0, 3).map((entry, idx) => (
                    <span key={idx} className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-800 flex items-center gap-1">
                      {entry.message || entry.exercise || 'Entry'}
                      {entry.calories ? <><Flame size={10} className="text-orange-300" /> ~{Math.round(entry.calories)} kcal</> : null}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleDelete(session)}
                  disabled={deletingId === session.id}
                  className="text-xs px-3 py-2 rounded-lg border border-red-500 text-red-300 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                  title="This will delete the session and remove the XP gained"
                >
                  {deletingId === session.id ? 'Deleting...' : 'Delete Session'}
                </button>
              </div>
              </div>
            ))}
          </div>
      )}
      <BottomNav />
    </main>
  );
};

export default History;
