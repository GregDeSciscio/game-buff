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
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseReps, setNewExerciseReps] = useState(10);
  const [newExerciseWeight, setNewExerciseWeight] = useState('');
  const [showCustomCard, setShowCustomCard] = useState(false);
  const [step, setStep] = useState(1);

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
  const commonExercises = baseExercises.map((exercise) => exercise.name);
  const TIMER_KEYWORDS = ['plank', 'hold', 'wall sit', 'stretch', 'hang'];

  const addTrigger = () => {
    // Use Date.now() for unique temp IDs during editing to prevent key conflicts
    const newId = Date.now();
    setTriggers([...triggers, { id: newId, label: '', exercise: 'Pushups', amount: 10, type: 'reps', color: 'bg-slate-600' }]);
  };

  const removeTrigger = (triggerId) => {
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

  const removeBaseExercise = (exerciseName) => {
    setBaseExercises((prev) => prev.filter((exercise) => exercise.name !== exerciseName));
  };

  const handleAddCustomExercise = () => {
    const name = newExerciseName.trim();
    if (!name) {
      alert('Enter an exercise name.');
      return;
    }
    if (baseExercises.some((exercise) => exercise.name.toLowerCase() === name.toLowerCase())) {
      alert('That exercise is already added.');
      return;
    }
    const reps = Number(newExerciseReps);
    if (Number.isNaN(reps) || reps < 0) {
      alert('Enter a valid reps number.');
      return;
    }
    const weightValue = newExerciseWeight ? Number(newExerciseWeight) : undefined;
    setBaseExercises((prev) => [
      ...prev,
      {
        name,
        reps,
        weight: weightValue,
      },
    ]);
    setNewExerciseName('');
    setNewExerciseReps(10);
    setNewExerciseWeight('');
    setShowCustomCard(false);
  };

  const resetBaseExercises = () => {
    if (!window.confirm('Reset base exercises to defaults? This will remove any custom additions and deletions.')) return;
    setBaseExercises(buildBaseExerciseState());
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
    <main className="page-shell min-h-screen pb-40 text-slate-100 safe-area-pb">
      <div className="app-container max-w-4xl px-4 py-5 sm:px-6 sm:py-8">

      {/* Header */}
      <div className="screen-header">
        <button onClick={() => navigate('/dashboard')} className="icon-button" aria-label="Back to arena">
            <ArrowLeft size={20} />
        </button>
        <div className="flex-1"><p className="eyebrow">Loadout builder</p><h1 className="screen-title">{id ? 'Tune your loadout' : 'Build a new loadout'}</h1></div>
        <div className="ml-auto">
          <button
            onClick={() => setShowMedia(!showMedia)}
            className="min-h-11 rounded-xl border border-white/10 bg-slate-800/70 px-3 text-xs font-semibold text-slate-300 hover:text-white"
          >
            {showMedia ? 'Hide animations' : 'Show animations'}
          </button>
      </div>
    </div>

      <div className="mb-6 grid grid-cols-3 gap-2" aria-label="Loadout setup progress">
        {[
          { number: 1, label: 'Game' },
          { number: 2, label: 'Workout' },
          { number: 3, label: 'Triggers' },
        ].map((item) => (
          <button key={item.number} type="button" onClick={() => setStep(item.number)} aria-current={step === item.number ? 'step' : undefined}
            className={`min-h-12 rounded-xl border px-2 text-sm font-bold transition ${step === item.number ? 'border-violet-300/40 bg-violet-500/15 text-white' : item.number < step ? 'border-emerald-300/20 bg-emerald-400/5 text-emerald-200' : 'border-white/10 bg-slate-900/40 text-slate-500'}`}>
            <span className="mr-1 font-mono text-xs">0{item.number}</span> {item.label}
          </button>
        ))}
      </div>

      <section className={step === 1 ? 'block' : 'hidden'} aria-label="Game details">

      <div className="surface-card mb-4 p-5">
        <p className="eyebrow">Step 1</p><h2 className="mt-1 text-xl font-extrabold text-white">Choose your game</h2><p className="mb-5 mt-1 text-sm text-slate-400">This becomes the name of your workout command center.</p>
        <label className="eyebrow mb-2 block" htmlFor="game-title">Game name</label>
        <input id="game-title" type="text" value={gameTitle} onChange={(e) => setGameTitle(e.target.value)} placeholder="e.g. Call of Duty" className="field-control" />
        {id && loadoutOwnerId && currentUserId && loadoutOwnerId !== currentUserId && (
          <p className="text-[11px] text-red-400 mt-1">You cannot edit or delete this loadout because it belongs to another user.</p>
        )}
        {id && visibility === 'preset' && (
          <p className="text-[11px] text-red-400 mt-1">Preset loadouts cannot be deleted.</p>
        )}
      </div>

      <div className="mb-4">
        <div className="surface-card space-y-3 p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Visibility</p>
          </div>
          <div className="segmented-control">
            {['private', 'public'].map((option) => (
              <button
                key={option}
                onClick={() => setVisibility(option)}
                className={`flex-1 text-sm font-semibold ${visibility === option ? 'bg-violet-500/20 text-white' : 'text-slate-400'}`}
              >
                {option === 'private' ? 'Private' : 'Public'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 flex items-start gap-2">
            <Share2 size={12} className="mt-0.5 text-blue-400" />
            Public loadouts appear in Community and can be copied by others.
          </p>
        </div>
      </div>
      {id && <button type="button" onClick={handleDelete} disabled={deleting} className="mt-2 min-h-11 text-sm font-semibold text-red-300 hover:text-red-200 disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete this loadout'}</button>}
      </section>

      <section className={step === 2 ? 'block' : 'hidden'} aria-label="Base workout">
      <div className="surface-card mb-6 p-5">
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Step 2</p><h2 className="mt-1 text-xl font-extrabold text-white">Set your base workout</h2>
              <p className="text-sm text-slate-400">These moves are always available during a session.</p>
            </div>
            <button
              type="button"
              onClick={resetBaseExercises}
              className="text-xs uppercase tracking-wide px-3 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-white"
            >
              Reset base workout
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {baseExercises.map((exercise) => {
            const meta = baseExerciseBlueprint.find((entry) => entry.name === exercise.name);
            return (
              <div key={exercise.name} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{exercise.name}</p>
                    <button
                      onClick={() => removeBaseExercise(exercise.name)}
                      className="text-red-400 hover:text-red-300 p-1 rounded-full bg-red-500/10 border border-transparent"
                      title="Remove exercise"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
                <div className="flex items-center gap-6 text-[11px] text-slate-500">
                  <span>Reps</span>
                  {meta?.hasWeight && (
                    <label className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="whitespace-nowrap">Weight</span>
                      <input
                        type="number"
                        min="0"
                        value={exercise.weight || 0}
                        onChange={(e) => updateBaseExercise(exercise.name, 'weight', e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg text-sm px-2 py-1 outline-none focus:border-blue-500"
                      />
                      <span className="text-[11px] text-slate-400">lbs</span>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setShowCustomCard(true)}
            disabled={showCustomCard}
            className="flex items-center gap-2 text-xs uppercase tracking-wide px-4 py-2 border border-slate-700 rounded-full text-slate-300 hover:text-white transition disabled:opacity-40"
          >
            <Plus size={14} />
            Custom Exercise
          </button>
        </div>
        {showCustomCard && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Custom exercise</p>
                <p className="text-sm text-slate-500">Add any move you want and it appears in the trigger dropdown.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCustomExercise}
                  className="text-xs uppercase tracking-wide bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-full"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowCustomCard(false)}
                  className="text-xs uppercase tracking-wide px-3 py-1 rounded-full border border-slate-700 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="Exercise name"
                className="col-span-full md:col-auto bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <input
                type="number"
                min="0"
                value={newExerciseReps}
                onChange={(e) => setNewExerciseReps(e.target.value)}
                placeholder="Reps"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <input
                type="number"
                min="0"
                value={newExerciseWeight}
                onChange={(e) => setNewExerciseWeight(e.target.value)}
                placeholder="Weight (optional)"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      </section>
      <section className={step === 3 ? 'block' : 'hidden'} aria-label="Game triggers">

      <div className="space-y-6 pb-32">
        <div className="flex flex-col gap-1">
          <p className="eyebrow">Step 3</p><h2 className="text-xl font-extrabold text-white">Connect game moments to movement</h2>
          <p className="text-sm text-slate-400">Each rule becomes one large button in your live session.</p>
        </div>
        {triggers.map((trigger) => (
          <div key={trigger.id} className="surface-card relative p-5 animate-fade-in-down">
            <button onClick={() => removeTrigger(trigger.id)} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-300" aria-label="Remove trigger"><Trash2 size={17} /></button>
            <div className="space-y-4">
              <p className="mr-12 rounded-xl border border-violet-300/10 bg-violet-500/5 px-3 py-2 text-sm text-violet-100">When <strong>{trigger.label || 'this happens'}</strong>, do <strong>{trigger.amount} {trigger.exercise}</strong>.</p>
              <div>
                <label className="eyebrow mb-2 block">When this happens</label>
                <input type="text" placeholder="e.g. I die" value={trigger.label} onChange={(e) => updateTrigger(trigger.id, 'label', e.target.value)} className="field-control" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="eyebrow mb-2 block">Do this</label>
                  <select value={trigger.exercise} onChange={(e) => updateTrigger(trigger.id, 'exercise', e.target.value)} className="field-control">
                    {commonExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                  </select>
                </div>
                <div className="w-20">
                  <label className="eyebrow mb-2 block">{trigger.type === 'timer' ? 'Secs' : 'Reps'}</label>
                  <input type="number" value={trigger.amount} onChange={(e) => updateTrigger(trigger.id, 'amount', parseInt(e.target.value) || 0)} className="field-control px-2 text-center" />
                </div>
              </div>
              <div>
                <label className="eyebrow mb-2 block">Session button color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button key={color.value} type="button" aria-label={`${color.name} button color`} aria-pressed={trigger.color === color.value} onClick={() => updateTrigger(trigger.id, 'color', color.value)} className={`min-h-11 rounded-xl px-3 text-xs font-bold text-white ${color.value} ${trigger.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-55'} transition-all`}>{color.name}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <button onClick={addTrigger} className="w-full py-3 border-2 border-dashed border-slate-700 text-slate-400 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-white transition-colors"><Plus size={18} /> Add Trigger</button>
      </div>
      </section>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-white/10 bg-[#090e19]/92 p-3 backdrop-blur-xl safe-area-pb">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {step > 1 && <button type="button" onClick={() => setStep((value) => value - 1)} className="min-h-12 flex-1 rounded-xl border border-white/10 bg-slate-800 px-4 font-bold text-slate-200">Back</button>}
          {step < 3 ? (
            <button type="button" onClick={() => setStep((value) => value + 1)} disabled={step === 1 && !gameTitle.trim()} className="neon-button min-h-12 flex-[2] rounded-xl px-4 font-bold disabled:cursor-not-allowed disabled:opacity-40">Continue to {step === 1 ? 'workout' : 'triggers'}</button>
          ) : (
            <button onClick={handleSave} disabled={loading} className="neon-button min-h-12 flex-[2] rounded-xl px-4 font-bold disabled:opacity-50">
              {loading ? 'Saving…' : <><Save size={18} /> {id ? 'Update loadout' : 'Save loadout'}</>}
            </button>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  );
};

export default CreateLoadout;
