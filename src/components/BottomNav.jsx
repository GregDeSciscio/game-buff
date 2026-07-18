import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, History, Users, Sparkles } from 'lucide-react';

const navItems = [
  { id: 'games', label: 'Arena', icon: Gamepad2, path: '/dashboard', match: ['/dashboard', '/game', '/edit', '/create'] },
  { id: 'history', label: 'Activity', icon: History, path: '/history', match: ['/history'] },
  { id: 'social', label: 'Social', icon: Users, path: '/leaderboard', match: ['/leaderboard', '/friends'] },
  { id: 'explore', label: 'Discover', icon: Sparkles, path: '/explore', match: ['/explore'] },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-dock fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#0b1120]/90 px-3 py-2 backdrop-blur-2xl safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match.some((m) => location.pathname.startsWith(m));
          return <button key={item.id} type="button" onClick={() => navigate(item.path)} title={item.label}
            aria-label={item.label} aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-12 min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${active ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {active && <span className="absolute inset-0 rounded-xl bg-[#7068ff]/15" />}
            <Icon size={19} strokeWidth={active ? 2.5 : 1.8} className={`relative ${active ? 'text-[#a69eff]' : ''}`} />
            <span className="relative">{item.label}</span>
          </button>;
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
