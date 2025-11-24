import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Save, User, Ruler, Weight } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) {
      console.error('Error fetching profile', error);
    } else {
      setProfile(data);
      setHeight(data?.height_cm ?? '');
      setWeight(data?.weight_kg ?? '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      height_cm: height === '' ? null : Number(height),
      weight_kg: weight === '' ? null : Number(weight),
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id);
    if (error) {
      console.error('Error updating profile', error);
      alert('Failed to save profile.');
    } else {
      await fetchProfile();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans safe-area-pb">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <User className="text-blue-400" size={22} />
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6 shadow-lg space-y-3">
        <div className="flex justify-between text-sm text-slate-300">
          <span>Username</span>
          <span className="text-white font-semibold">{profile?.username || '—'}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Total XP</span>
          <span className="text-white font-semibold">{profile?.total_xp ?? 0}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300">
          <span>Level</span>
          <span className="text-white font-semibold">{profile?.current_level ?? 1}</span>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <Ruler className="text-blue-400" size={18} />
          <div className="flex-1">
            <label className="text-xs uppercase text-slate-400">Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 180"
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Weight className="text-blue-400" size={18} />
          <div className="flex-1">
            <label className="text-xs uppercase text-slate-400">Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 75"
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving...' : (
            <>
              <Save size={18} /> Save Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Profile;
