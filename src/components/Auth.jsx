import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Gamepad2, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: { data: { full_name: email.split('@')[0] } }
        });
        if (error) throw error;
        alert("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 font-sans">
      <div className="mb-8 text-center animate-fade-in-down">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20 rotate-3">
          <Gamepad2 size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tighter">GAME BUFF</h1>
        <p className="text-slate-400 mt-2">Level up in real life.</p>
      </div>

      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-xl">
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="player@one.com" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="••••••••" />
          </div>
          {errorMsg && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900/50">{errorMsg}</div>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : <>{isSignUp ? 'Create Account' : 'Login'} <ArrowRight size={18} /></>}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            {isSignUp ? "Already have a save file?" : "New player?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-blue-400 font-bold hover:underline">{isSignUp ? "Login" : "Sign Up"}</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;