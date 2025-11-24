import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Trophy, Clock } from 'lucide-react';

const History = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Helper to format date nicely
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans safe-area-pb">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Session History</h1>
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
              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-1 text-xs text-slate-300">
                  <Clock size={14} className="text-blue-400" /> 
                  {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                </div>
                {/* Detailed Logs Accordion could go here in v2 */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;