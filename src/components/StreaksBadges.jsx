import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Flame, ShieldCheck, Target } from 'lucide-react';

const badgeLabels = {
  reps_100: '100 Reps',
  reps_500: '500 Reps',
  reps_1000: '1K Reps',
  sessions_10: '10 Sessions',
  sessions_25: '25 Sessions',
  streak_7: '7-Day Streak',
};

const StreaksBadges = () => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Try streaks table if exists
    const { data: streakData } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (streakData) {
      setCurrentStreak(streakData.current_streak || 0);
      setLongestStreak(streakData.longest_streak || 0);
    }

    const { data: badgeData } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', user.id)
      .limit(10);
    setBadges(badgeData || []);
    setLoading(false);
  };

  if (loading) return <div className="text-sm text-slate-400">Loading streaks...</div>;

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-orange-300">
          <Flame size={16} />
          <div>
            <p className="eyebrow">Current streak</p>
            <p className="text-2xl font-bold text-white">{currentStreak}<span className="ml-1 text-sm font-medium text-slate-400">days</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="eyebrow">Best run</p>
          <p className="text-sm font-semibold text-white">{longestStreak} days</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-950/25 p-2.5 text-slate-300 text-xs">
        <Target size={14} className="text-blue-400" />
        <span>Keep your streak by completing at least one session today.</span>
      </div>

      <div>
        <div className="eyebrow mb-2">Badge shelf</div>
        {badges.length === 0 ? (
          <p className="text-xs text-slate-500">No badges earned yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] text-slate-100">
                <ShieldCheck size={12} className="text-emerald-300" />
                {badgeLabels[badge.badge_key] || badge.badge_key}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StreaksBadges;
