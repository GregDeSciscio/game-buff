const MET_TABLE = {
  pushups: 8,
  burpees: 10,
  squats: 5.5,
  lunges: 5.5,
  situps: 4,
  crunches: 4,
  plank: 3.3,
  'jumping jacks': 8,
  pullups: 8,
  running: 9,
  jog: 7,
};

export const calculateCalories = (trigger, weightKg = 75) => {
  const name = (trigger.exercise || '').toLowerCase();
  // allow explicit met on trigger
  const metFromTrigger = typeof trigger.met === 'number' ? trigger.met : null;
  const matchedMet = Object.entries(MET_TABLE).find(([key]) => name.includes(key))?.[1];
  const met = metFromTrigger || matchedMet || 5; // moderate default

  let seconds = 0;
  if (trigger.type === 'timer') {
    seconds = trigger.amount || 0;
  } else {
    const reps = trigger.amount || 0;
    seconds = reps * 2; // rough seconds per rep
  }
  return met * weightKg * (seconds / 3600);
};
