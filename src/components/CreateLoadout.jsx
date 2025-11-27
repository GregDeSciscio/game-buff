import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, Gamepad2, ArrowLeft, Share2 } from 'lucide-react';
import BottomNav from './BottomNav';

const CreateLoadout = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Capture ID from URL to check if we are editing
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [visibility, setVisibility] = useState('private');
  const [sourceLoadoutId, setSourceLoadoutId] = useState(null);
  const [presets, setPresets] = useState([]);
  const [community, setCommunity] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(false);

  const [gameTitle, setGameTitle] = useState('');
  const [triggers, setTriggers] = useState([
    { id: 1, label: '', exercise: 'Pushups', amount: 10, type: 'reps', color: 'bg-red-600' }
  ]);

  // Load existing data if editing
  useEffect(() => {
    if (id) {
      fetchLoadout();
    }
  }, [id]);

  const fetchLoadout = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('loadouts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(error);
      navigate('/dashboard');
    } else {
      setGameTitle(data.game_title);
      // Ensure triggers are set correctly from JSONB
      setTriggers(data.triggers);
      setVisibility(data.visibility || 'private');
      setSourceLoadoutId(data.source_loadout_id || null);
    }
    setLoading(false);
  };

  const colorOptions = [
    { name: 'Red', value: 'bg-red-600' },
    { name: 'Blue', value: 'bg-blue-600' },
    { name: 'Green', value: 'bg-emerald-600' },
    { name: 'Purple', value: 'bg-purple-600' },
    { name: 'Orange', value: 'bg-orange-600' },
  ];
  const commonExercises = ['Pushups', 'Squats', 'Situps', 'Plank', 'Burpees', 'Lunges'];
  const TIMER_KEYWORDS = ['plank', 'hold', 'wall sit', 'stretch', 'hang'];

  const addTrigger = () => {
    // Use Date.now() for unique temp IDs during editing to prevent key conflicts
    const newId = Date.now();
    setTriggers([...triggers, { id: newId, label: '', exercise: 'Pushups', amount: 10, type: 'reps', color: 'bg-slate-600' }]);
  };

  const removeTrigger = (triggerId) => {
    if (triggers.length === 1) return;
    setTriggers(triggers.filter(t => t.id !== triggerId));
  };

  const updateTrigger = (triggerId, field, value) => {
    if (field === 'exercise') {
        const isTimer = TIMER_KEYWORDS.some(k => value.toLowerCase().includes(k));
        setTriggers(triggers.map(t => t.id === triggerId ? { ...t, exercise: value, type: isTimer ? 'timer' : 'reps', amount: isTimer ? 30 : 10 } : t));
    } else {
        setTriggers(triggers.map(t => t.id === triggerId ? { ...t, [field]: value } : t));
    }
  };

  const handleSave = async () => {
    if (!gameTitle.trim()) {
        alert("Please enter a game name");
        return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      game_title: gameTitle,
      triggers: triggers,
      visibility,
      source_loadout_id: sourceLoadoutId,
    };

    let error;

    if (id) {
      // UPDATE EXISTING
      const { error: updateError } = await supabase
        .from('loadouts')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);
      error = updateError;
    } else {
      // CREATE NEW
      const { error: insertError } = await supabase
        .from('loadouts')
        .insert([payload]);
      error = insertError;
    }

    if (error) {
        console.error('Save loadout failed', error);
        alert(`Error saving loadout: ${error.message || 'Unknown error'}`);
        setLoading(false);
    } else {
        navigate('/dashboard');
    }
  };

  if (loading && id && !gameTitle) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Loadout...</div>;

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this game/loadout? This will remove it and any dependent data. This cannot be undone.');
    if (!confirmed) return;
    setDeleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('loadouts').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      console.error(error);
      alert('Error deleting loadout');
      setDeleting(false);
      return;
    }
    navigate('/dashboard');
  };

  const fetchPresets = async () => {
    setLoadingPresets(true);
    const title = gameTitle.trim();
    const filters = title ? { column: 'game_title', value: title } : null;
    let query = supabase.from('loadouts').select('*').eq('visibility', 'preset').limit(10);
    if (filters) query = query.eq(filters.column, filters.value);
    const { data } = await query;
    setPresets(data || []);
    setLoadingPresets(false);
  };

  const fetchCommunity = async () => {
    setLoadingPresets(true);
    const title = gameTitle.trim();
    const { data } = await supabase
      .from('loadouts')
      .select('*, profiles(display_name, username)')
      .eq('visibility', 'public')
      .ilike('game_title', title ? title : '%')
      .order('created_at', { ascending: false })
      .limit(10);
    setCommunity(data || []);
    setLoadingPresets(false);
  };

  const applyLoadout = (loadout) => {
    setGameTitle(loadout.game_title);
    setTriggers(loadout.triggers);
    setSourceLoadoutId(loadout.id);
    setVisibility('private');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 pb-40 font-sans safe-area-pb">

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gamepad2 className="text-blue-400" /> {id ? 'Edit Loadout' : 'New Loadout'}
        </h1>
      </div>

      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Game Name</label>
        <input type="text" value={gameTitle} onChange={(e) => setGameTitle(e.target.value)} placeholder="e.g. Call of Duty" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Visibility</label>
          <div className="flex gap-2">
            {['private', 'public'].map((option) => (
              <button
                key={option}
                onClick={() => setVisibility(option)}
                className={`flex-1 py-2 rounded-lg border ${visibility === option ? 'border-blue-500 text-white' : 'border-slate-700 text-slate-400'}`}
              >
                {option === 'private' ? 'Private' : 'Share with Community'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-2">
            <Share2 size={12} className="mt-0.5 text-blue-400" />
            Public loadouts appear in Community and can be copied by others. Private stays yours.
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-400">Presets & Community</span>
            <div className="flex gap-2">
              <button onClick={fetchPresets} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white">Presets</button>
              <button onClick={fetchCommunity} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white">Community</button>
            </div>
          </div>
          {loadingPresets ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {presets.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-white font-semibold">{p.game_title}</p>
                    <p className="text-[11px] text-slate-500">Preset · {p.triggers.length} triggers</p>
                  </div>
                  <button onClick={() => applyLoadout(p)} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500">Use</button>
                </div>
              ))}
              {community.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-white font-semibold">{p.game_title}</p>
                    <p className="text-[11px] text-slate-500">
                      Community · {p.triggers.length} triggers · {p.profiles?.display_name || p.profiles?.username || 'Player'}
                      {p.source_loadout_id && <span> · Copy</span>}
                    </p>
                  </div>
                  <button onClick={() => applyLoadout(p)} className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500">Use</button>
                </div>
              ))}
              {presets.length === 0 && community.length === 0 && <p className="text-sm text-slate-500">No presets/community loadouts loaded.</p>}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {triggers.map((trigger) => (
          <div key={trigger.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative animate-fade-in-down">
            <button onClick={() => removeTrigger(trigger.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-2 transition-colors"><Trash2 size={16} /></button>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Trigger</label>
                <input type="text" placeholder="e.g. Died" value={trigger.label} onChange={(e) => updateTrigger(trigger.id, 'label', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Do this</label>
                  <select value={trigger.exercise} onChange={(e) => updateTrigger(trigger.id, 'exercise', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm transition-colors">
                    {commonExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                  </select>
                </div>
                <div className="w-20">
                  <label className="text-xs text-slate-500 mb-1 block">{trigger.type === 'timer' ? 'Secs' : 'Reps'}</label>
                  <input type="number" value={trigger.amount} onChange={(e) => updateTrigger(trigger.id, 'amount', parseInt(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-center transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Color</label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button key={color.value} onClick={() => updateTrigger(trigger.id, 'color', color.value)} className={`w-8 h-8 rounded-full ${color.value} ${trigger.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : 'opacity-50'} transition-all`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <button onClick={addTrigger} className="w-full py-3 border-2 border-dashed border-slate-700 text-slate-400 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-white transition-colors"><Plus size={18} /> Add Trigger</button>
      </div>

      <div className="fixed left-0 right-0 bottom-16 p-4 bg-slate-900/90 backdrop-blur border-t border-slate-800 safe-area-pb">
        <div className="flex items-center gap-3">
          {id && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-3 border border-red-600 text-red-300 hover:bg-red-600 hover:text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition"
            >
              {deleting ? 'Deleting...' : 'Delete Loadout'}
            </button>
          )}
          <button onClick={handleSave} disabled={loading} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all">
             {loading ? 'Saving...' : <><Save size={18} /> {id ? 'Update Loadout' : 'Save Loadout'}</>}
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default CreateLoadout;
