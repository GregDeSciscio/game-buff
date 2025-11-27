import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, History, Trophy, Users } from 'lucide-react';

const navItems = [
  { id: 'games', label: 'Games', icon: Gamepad2, path: '/dashboard', match: ['/dashboard', '/game', '/edit', '/create'] },
  { id: 'history', label: 'History', icon: History, path: '/history', match: ['/history'] },
  { id: 'leaders', label: 'Leaders', icon: Trophy, path: '/leaderboard', match: ['/leaderboard'] },
  { id: 'friends', label: 'Friends', icon: Users, path: '/friends', match: ['/friends'] },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800 backdrop-blur px-6 py-3 safe-area-pb z-40">
      <div className="flex items-center justify-around text-slate-400 text-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match.some((m) => location.pathname.startsWith(m));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition ${active ? 'text-white' : 'hover:text-white'}`}
              title={item.label}
            >
              <Icon size={20} />
              <span className="text-[12px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
