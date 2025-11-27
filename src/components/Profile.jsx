import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Save, User, Ruler, Weight } from 'lucide-react';
import BottomNav from './BottomNav';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weightLbs, setWeightLbs] = useState('');

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
      setDisplayName(data?.display_name || '');
      if (data?.height_cm) {
        const totalInches = data.height_cm / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches - feet * 12);
        setHeightFeet(feet || '');
        setHeightInches(inches || '');
      } else {
        setHeightFeet('');
        setHeightInches('');
      }
      if (data?.weight_kg) {
        const lbs = Math.round(data.weight_kg * 2.20462);
        setWeightLbs(lbs || '');
      } else {
        setWeightLbs('');
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const feetNum = Number(heightFeet);
    const inchesNum = Number(heightInches);
    const lbsNum = Number(weightLbs);

    const totalInches = (!isNaN(feetNum) && !isNaN(inchesNum)) ? (feetNum * 12 + inchesNum) : null;
    const cm = totalInches !== null && !isNaN(totalInches) && totalInches > 0 ? Math.round(totalInches * 2.54) : null;
    const kg = !isNaN(lbsNum) && lbsNum > 0 ? Math.round((lbsNum / 2.20462) * 10) / 10 : null;

    const payload = {
      display_name: displayName?.trim() || null,
      height_cm: cm,
      weight_kg: kg,
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans pb-32 safe-area-pb">
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
        <div className="text-sm text-slate-300">
          <div className="flex justify-between items-center mb-1">
            <span>Display Name</span>
          </div>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Public name for leaderboards"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            <label className="text-xs uppercase text-slate-400">Height (ft / in)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="number"
                value={heightFeet}
                onChange={(e) => setHeightFeet(e.target.value)}
                placeholder="5"
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={heightInches}
                onChange={(e) => setHeightInches(e.target.value)}
                placeholder="10"
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Weight className="text-blue-400" size={18} />
          <div className="flex-1">
            <label className="text-xs uppercase text-slate-400">Weight (lbs)</label>
            <input
              type="number"
              value={weightLbs}
              onChange={(e) => setWeightLbs(e.target.value)}
              placeholder="180"
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
      <BottomNav />
    </div>
  );
};

export default Profile;
