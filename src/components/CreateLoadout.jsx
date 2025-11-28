import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, Gamepad2, ArrowLeft, Share2 } from 'lucide-react';
import BottomNav from './BottomNav';
import { getExerciseMedia } from '../utilities/exerciseMedia';
import { baseExerciseBlueprint, buildBaseExerciseState } from '../utilities/baseExercises';

const CreateLoadout = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Capture ID from URL to check if we are editing
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loadoutOwnerId, setLoadoutOwnerId] = useState(null);
  const [visibility, setVisibility] = useState('private');
  const [sourceLoadoutId, setSourceLoadoutId] = useState(null);
  const [showMedia, setShowMedia] = useState(true);

  const [gameTitle, setGameTitle] = useState('');
  const [triggers, setTriggers] = useState([
    { id: 1, label: '', exercise: 'Pushups', amount: 10, type: 'reps', color: 'bg-red-600' }
  ]);
  const [baseExercises, setBaseExercises] = useState(() => buildBaseExerciseState());

  // Load existing data if editing
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    initUser();
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
      setBaseExercises(buildBaseExerciseState(data.base_exercises));
      setVisibility(data.visibility || 'private');
      setSourceLoadoutId(data.source_loadout_id || null);
      setLoadoutOwnerId(data.user_id);
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
  const commonExercises = baseExerciseBlueprint.map((exercise) => exercise.name);
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

  const updateBaseExercise = (exerciseName, field, value) => {
    setBaseExercises((prev) =>
      prev.map((exercise) =>
        exercise.name === exerciseName
          ? {
              ...exercise,
              [field]: field === 'reps' || field === 'weight' ? Math.max(0, Number(value) || 0) : value,
            }
          : exercise
      )
    );
  };

  const adjustBaseExercise = (exerciseName, delta) => {
    setBaseExercises((prev) =>
      prev.map((exercise) =>
        exercise.name === exerciseName
          ? {
              ...exercise,
              reps: Math.max(0, (exercise.reps || 0) + delta),
            }
          : exercise
      )
    );
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
      base_exercises: baseExercises,
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
    if (!currentUserId || loadoutOwnerId !== currentUserId) {
      alert('You cannot delete a loadout you do not own.');
      return;
    }
    if (visibility === 'preset') {
      alert('Preset loadouts cannot be deleted.');
      return;
    }
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
        <div className="ml-auto">
          <button
            onClick={() => setShowMedia(!showMedia)}
            className="text-[11px] text-slate-400 hover:text-white px-3 py-1 border border-slate-700 rounded-full"
          >
            {showMedia ? 'Hide animations' : 'Show animations'}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Game Name</label>
        <input type="text" value={gameTitle} onChange={(e) => setGameTitle(e.target.value)} placeholder="e.g. Call of Duty" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
        {id && loadoutOwnerId && currentUserId && loadoutOwnerId !== currentUserId && (
          <p className="text-[11px] text-red-400 mt-1">You cannot edit or delete this loadout because it belongs to another user.</p>
        )}
        {id && visibility === 'preset' && (
          <p className="text-[11px] text-red-400 mt-1">Preset loadouts cannot be deleted.</p>
        )}
      </div>

      <div className="mb-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Visibility</p>
          </div>
          <div className="flex gap-2">
            {['private', 'public'].map((option) => (
              <button
                key={option}
                onClick={() => setVisibility(option)}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold ${visibility === option ? 'border-blue-500 text-white' : 'border-slate-700 text-slate-400'}`}
              >
                {option === 'private' ? 'Private' : 'Share with Community'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 flex items-start gap-2">
            <Share2 size={12} className="mt-0.5 text-blue-400" />
            Public loadouts appear in Community and can be copied by others. Private stays yours.
          </p>
        </div>
      </div>
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 mb-6 shadow-2xl shadow-slate-900/40">
        <div className="flex flex-col gap-1 mb-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Freeform Defaults</p>
          <h2 className="text-xl font-bold text-white">Base exercises</h2>
          <p className="text-sm text-slate-400">Set rep goals for each preset exercise before building triggers on top.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {baseExercises.map((exercise) => {
            const meta = baseExerciseBlueprint.find((entry) => entry.name === exercise.name);
            return (
              <div key={exercise.name} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">{exercise.name}</p>
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-full px-2">
                  <button
                    type="button"
                    onClick={() => adjustBaseExercise(exercise.name, -1)}
                    className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-full transition"
                  >
                    &minus;
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={exercise.reps}
                    onChange={(e) => updateBaseExercise(exercise.name, 'reps', e.target.value)}
                    className="w-14 bg-transparent border-none text-center text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustBaseExercise(exercise.name, 1)}
                    className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-full transition"
                  >
                    +
                  </button>
                </div>
              </div>
                <p className="text-[11px] text-slate-500">Reps</p>
                {meta?.hasWeight && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500 uppercase tracking-wide">Weight (lbs)</label>
                    <input
                      type="number"
                      min="0"
                      value={exercise.weight || 0}
                      onChange={(e) => updateBaseExercise(exercise.name, 'weight', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg text-sm px-2 py-1 outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wider text-slate-400">Triggers</p>
          <p className="text-[11px] text-slate-500">Use triggers to turn specific moments into rep or timer bursts on top of the base exercises.</p>
        </div>
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
              {showMedia && getExerciseMedia(trigger.exercise) && (
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10">
                    <span className="absolute inset-0 bg-gradient-to-br from-emerald-400/70 via-sky-400/70 to-purple-500/70 animate-[spin_3s_linear_infinite] opacity-70" />
                    <span className="absolute inset-1 bg-slate-900/70 rounded-full" />
                  </span>
                  <span>Animated cue preview</span>
                </div>
              )}
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
