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

export const buildBaseExerciseState = (overrides = []) =>
  baseExerciseBlueprint.map((exercise) => {
    const match = Array.isArray(overrides)
      ? overrides.find((item) => item.name === exercise.name)
      : null;
    return {
      name: exercise.name,
      reps: typeof match?.reps === 'number' ? match.reps : exercise.defaultReps,
      weight:
        exercise.hasWeight
          ? typeof match?.weight === 'number'
            ? match.weight
            : exercise.defaultWeight
          : undefined,
    };
  });
