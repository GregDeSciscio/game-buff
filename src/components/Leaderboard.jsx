import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Trophy, Users, Globe2, Loader2 } from 'lucide-react';
import BottomNav from './BottomNav';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('global');
  const [globalRows, setGlobalRows] = useState([]);
  const [friendRows, setFriendRows] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    // Global top 50
    const { data: globalData } = await supabase
      .from('profiles')
      .select('id, username, display_name, total_xp, current_level')
      .order('total_xp', { ascending: false })
      .limit(50);
    setGlobalRows(globalData || []);

    // My rank (approx by counting higher XP)
    if (globalData?.length) {
      const myProfile = globalData.find((p) => p.id === user.id);
      if (myProfile) {
        setMyRank(globalData.findIndex((p) => p.id === user.id) + 1);
      } else {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('total_xp', globalData[globalData.length - 1].total_xp);
        setMyRank((count || 0) + globalData.length + 1);
      }
    }

    // Friends leaderboard
    const { data: friendsData } = await supabase
      .from('friends')
      .select(`
        id,
        status,
        requester_id,
        addressee_id,
        requester:requester_id ( id, username, display_name, total_xp, current_level ),
        addressee:addressee_id ( id, username, display_name, total_xp, current_level )
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const friendProfiles = (friendsData || []).map((f) => {
      const other = f.requester_id === user.id ? f.addressee : f.requester;
      return other;
    }).filter(Boolean);

    const dedup = new Map();
    friendProfiles.forEach((p) => dedup.set(p.id, p));
    const sortedFriends = Array.from(dedup.values()).sort((a, b) => b.total_xp - a.total_xp);
    setFriendRows(sortedFriends);

    setLoading(false);
  };

  const renderRows = (rows) => (
    rows.length === 0 ? (
      <div className="text-center text-slate-500 py-6 text-sm">No entries yet.</div>
    ) : (
      <div className="divide-y divide-slate-800">
        {rows.map((row, idx) => (
          <div key={row.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 text-center text-xs font-semibold text-slate-400">#{idx + 1}</div>
              <div>
                <p className="text-white font-semibold">{row.display_name || row.username || 'Player'}</p>
                <p className="text-xs text-slate-400">Level {row.current_level || 1}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-bold">{row.total_xp ?? 0} XP</p>
            </div>
          </div>
        ))}
      </div>
    )
  );

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
          <Trophy className="text-yellow-400" size={22} />
          <h1 className="text-xl font-bold">Leaderboards</h1>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-2 mb-4 flex">
        <button
          onClick={() => setTab('global')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm ${tab === 'global' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
        >
          <Globe2 size={16} /> Global
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm ${tab === 'friends' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
        >
          <Users size={16} /> Friends
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="animate-spin" size={18} /> Loading leaderboards...
        </div>
      ) : (
        <>
          {tab === 'global' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
              <div className="flex justify-between mb-4">
                <p className="text-sm text-slate-300">Top Players</p>
                {myRank && <p className="text-sm text-blue-400">Your rank: #{myRank}</p>}
              </div>
              {renderRows(globalRows)}
            </div>
          )}

          {tab === 'friends' && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
              <div className="flex justify-between mb-4">
                <p className="text-sm text-slate-300">Friends Leaderboard</p>
                <p className="text-xs text-slate-500">Accepted friends only</p>
              </div>
              {renderRows(friendRows)}
            </div>
          )}
        </>
      )}
      <BottomNav />
    </div>
  );
};

export default Leaderboard;
