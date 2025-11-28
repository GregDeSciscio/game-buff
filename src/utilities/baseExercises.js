export const baseExerciseBlueprint = [
  { name: 'Squats', defaultReps: 15 },
  { name: 'Pushups', defaultReps: 15 },
  { name: 'Pullups', defaultReps: 3 },
  { name: 'Curls', defaultReps: 10, hasWeight: true, defaultWeight: 25 },
  { name: 'Jumping Jacks', defaultReps: 15 },
  { name: 'High Knees', defaultReps: 20 },
  { name: 'Situps', defaultReps: 10 },
  { name: 'Burpees', defaultReps: 5 },
];

export const buildBaseExerciseState = (savedExercises) => {
  if (Array.isArray(savedExercises) && savedExercises.length > 0) {
    return savedExercises.map((exercise) => {
      const blueprintEntry = baseExerciseBlueprint.find((entry) => entry.name === exercise.name);
      return {
        name: exercise.name,
        reps:
          typeof exercise.reps === 'number'
            ? exercise.reps
            : blueprintEntry?.defaultReps ?? 0,
        weight:
          exercise?.weight !== undefined
            ? exercise.weight
            : blueprintEntry?.hasWeight
            ? blueprintEntry.defaultWeight
            : undefined,
      };
    });
  }

  return baseExerciseBlueprint.map((exercise) => ({
    name: exercise.name,
    reps: exercise.defaultReps,
    weight: exercise.hasWeight ? exercise.defaultWeight : undefined,
  }));
};
