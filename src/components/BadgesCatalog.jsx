import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';

const badgeCatalog = [
  { key: 'sessions_10', label: '10 Sessions', description: 'Complete 10 sessions' },
  { key: 'sessions_25', label: '25 Sessions', description: 'Complete 25 sessions' },
  { key: 'sessions_50', label: '50 Sessions', description: 'Complete 50 sessions' },
  { key: 'streak_7', label: '7-Day Streak', description: 'Work out 7 days in a row' },
];

const BadgesCatalog = () => {
  const [earnedKeys, setEarnedKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('badges').select('badge_key').eq('user_id', user.id);
      setEarnedKeys((data || []).map((b) => b.badge_key));
      setLoading(false);
    };
    fetchBadges();
  }, []);

  if (loading) return <div className="text-sm text-slate-400">Loading badges...</div>;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-emerald-300" size={16} />
        <div>
          <p className="text-sm font-semibold text-white">Badges</p>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Info size={12} /> Earned badges are lit; locked ones show criteria.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {badgeCatalog.map((badge) => {
          const earned = earnedKeys.includes(badge.key);
          return (
            <div
              key={badge.key}
              className={`p-2 rounded-lg border text-[11px] ${
                earned ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                {earned ? <ShieldCheck size={12} /> : <Lock size={12} className="text-slate-500" />}
                <span className="font-semibold">{badge.label}</span>
              </div>
              <p className="text-[10px]">{badge.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgesCatalog;
