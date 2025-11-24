import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Import Pages
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import CreateLoadout from './components/CreateLoadout';
import GameBuffSession from './components/GameBuffSession';
import History from './components/History'; // Added import

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes (e.g. auth token expiration)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="bg-slate-900 h-screen w-screen flex items-center justify-center text-slate-500">Loading...</div>;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Wrapper to handle Session data passing
const SessionWrapper = () => {
    const location = useLocation();
    // If user refreshes /session page without state, redirect to dashboard
    if (!location.state?.loadout) {
        return <Navigate to="/dashboard" replace />;
    }
    return <GameBuffSession initialLoadout={location.state.loadout} />;
}


const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Auth />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/create" element={
          <ProtectedRoute>
            <CreateLoadout />
          </ProtectedRoute>
        } />
        
        <Route path="/session" element={
          <ProtectedRoute>
            <SessionWrapper />
          </ProtectedRoute>
        } />

        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;