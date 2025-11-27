const mediaMap = {
  pushups: { label: 'Pushups' },
  burpees: { label: 'Burpees' },
  squats: { label: 'Squats' },
  lunges: { label: 'Lunges' },
  situps: { label: 'Situps' },
  crunches: { label: 'Crunches' },
  plank: { label: 'Plank' },
  'jumping jacks': { label: 'Jumping Jacks' },
  pullups: { label: 'Pullups' },
};

export const getExerciseMedia = (exercise = '') => {
  const key = exercise.toLowerCase();
  const matched = Object.keys(mediaMap).find((k) => key.includes(k));
  if (!matched) return null;
  return mediaMap[matched];
};
