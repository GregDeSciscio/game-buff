import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Gamepad2 } from 'lucide-react';

const CreateLoadout = () => {
  const navigate = useNavigate();
  const [gameTitle, setGameTitle] = useState('');
  const [triggers, setTriggers] = useState([
    { id: 1, label: '', exercise: 'Pushups', amount: 10, type: 'reps', color: 'bg-red-600' }
  ]);

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
    const newId = triggers.length + 1;
    setTriggers([...triggers, { id: newId, label: '', exercise: 'Pushups', amount: 10, type: 'reps', color: 'bg-slate-600' }]);
  };

  const removeTrigger = (id) => {
    if (triggers.length === 1) return;
    setTriggers(triggers.filter(t => t.id !== id));
  };

  const updateTrigger = (id, field, value) => {
    if (field === 'exercise') {
        const isTimer = TIMER_KEYWORDS.some(k => value.toLowerCase().includes(k));
        setTriggers(triggers.map(t => t.id === id ? { ...t, exercise: value, type: isTimer ? 'timer' : 'reps', amount: isTimer ? 30 : 10 } : t));
    } else {
        setTriggers(triggers.map(t => t.id === id ? { ...t, [field]: value } : t));
    }
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const payload = { user_id: user.id, game_title: gameTitle, triggers: triggers };
    const { error } = await supabase.from('loadouts').insert([payload]);
    
    if (error) {
        console.error(error);
        alert('Error saving loadout');
    } else {
        navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 pb-24 font-sans">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Gamepad2 className="text-blue-400" /> New Loadout</h1>
      </div>
      <div className="mb-6">
        <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2">Game Name</label>
        <input type="text" value={gameTitle} onChange={(e) => setGameTitle(e.target.value)} placeholder="e.g. Call of Duty" className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 outline-none" />
      </div>

      <div className="space-y-6">
        {triggers.map((trigger) => (
          <div key={trigger.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative">
            <button onClick={() => removeTrigger(trigger.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-2"><Trash2 size={16} /></button>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Trigger</label>
                <input type="text" placeholder="e.g. Died" value={trigger.label} onChange={(e) => updateTrigger(trigger.id, 'label', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm outline-none" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Do this</label>
                  <select value={trigger.exercise} onChange={(e) => updateTrigger(trigger.id, 'exercise', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm">
                    {commonExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                  </select>
                </div>
                <div className="w-20">
                  <label className="text-xs text-slate-500 mb-1 block">{trigger.type === 'timer' ? 'Secs' : 'Reps'}</label>
                  <input type="number" value={trigger.amount} onChange={(e) => updateTrigger(trigger.id, 'amount', parseInt(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-center" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">Color</label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button key={color.value} onClick={() => updateTrigger(trigger.id, 'color', color.value)} className={`w-8 h-8 rounded-full ${color.value} ${trigger.color === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : 'opacity-50'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <button onClick={addTrigger} className="w-full py-3 border-2 border-dashed border-slate-700 text-slate-400 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800"><Plus size={18} /> Add Trigger</button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur border-t border-slate-800">
        <button onClick={handleSave} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2"><Save size={18} /> Save Loadout</button>
      </div>
    </div>
  );
};

export default CreateLoadout;