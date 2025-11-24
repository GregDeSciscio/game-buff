import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Plus, Play, Trophy, LogOut } from 'lucide-react';
import { getLevelProgress } from '../utilities/gameLogic';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loadouts, setLoadouts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(profileData);

    const { data: loadoutsData } = await supabase.from('loadouts').select('*').eq('user_id', user.id);
    setLoadouts(loadoutsData || []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading Data...</div>;

  const { currentLevel, progressPercent, neededXP, currentXP } = getLevelProgress(profile?.total_xp || 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-yellow-500" /> LVL {currentLevel}</h1>
        <button onClick={handleLogout} className="text-slate-500 hover:text-white"><LogOut size={20} /></button>
      </div>

      <div className="bg-slate-800 p-4 rounded-xl mb-8 border border-slate-700 shadow-lg">
        <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase tracking-wide">
          <span>Current XP</span><span>Next Level</span>
        </div>
        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-2 text-right text-xs text-blue-400 font-mono">{Math.floor(currentXP)} / {neededXP} XP</div>
      </div>

      <h2 className="text-lg font-bold mb-4 text-white">My Games</h2>
      <div className="grid gap-4">
        {loadouts.map((loadout) => (
          <div key={loadout.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-blue-500 transition-colors">
            <div>
              <h3 className="font-bold text-white text-lg">{loadout.game_title}</h3>
              <p className="text-slate-400 text-xs">{loadout.triggers.length} Triggers defined</p>
            </div>
            <button onClick={() => navigate('/session', { state: { loadout } })} className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-full shadow-lg shadow-green-900/20"><Play size={20} fill="currentColor" /></button>
          </div>
        ))}
        <button onClick={() => navigate('/create')} className="border-2 border-dashed border-slate-700 text-slate-400 p-6 rounded-xl flex flex-col items-center justify-center hover:bg-slate-800 hover:text-white transition-all min-h-[100px]">
          <Plus size={32} className="mb-2" /><span className="font-bold">Add New Game Loadout</span>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;