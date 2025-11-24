import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Components
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import CreateLoadout from './components/CreateLoadout';
import GameBuffSession from './components/GameBuffSession';

const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="bg-slate-900 h-screen w-screen flex items-center justify-center text-slate-500">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return children;
};

const SessionWrapper = () => {
    const location = useLocation();
    if (!location.state?.loadout) {
        return <Navigate to="/dashboard" replace />;
    }
    return <GameBuffSession initialLoadout={location.state.loadout} />;
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateLoadout /></ProtectedRoute>} />
        <Route path="/session" element={<ProtectedRoute><SessionWrapper /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;