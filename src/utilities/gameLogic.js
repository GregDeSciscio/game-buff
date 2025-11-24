const EXERCISE_TIERS = {
    'Jumping Jacks': 1,
    'Squats': 1.5,
    'Situps': 1.5,
    'Plank': 1.5,
    'Pushups': 2,
    'Pull-ups': 3,
    'Burpees': 3
  };
  
  export const calculateXP = (exerciseName, amount, type) => {
    let baseXP = 0;
    if (type === 'timer') {
      baseXP = amount * 5; 
    } else {
      baseXP = amount * 10;
    }
    const multiplier = EXERCISE_TIERS[exerciseName] || 1.5;
    return Math.floor(baseXP * multiplier);
  };
  
  export const getLevelProgress = (totalXP) => {
    let level = 1;
    let xpForNextLevel = 1000;
    let xpRemaining = totalXP;
  
    while (xpRemaining >= xpForNextLevel) {
      xpRemaining -= xpForNextLevel;
      level++;
      xpForNextLevel = level * 1000;
    }
  
    return {
      currentLevel: level,
      currentXP: xpRemaining,
      neededXP: xpForNextLevel,
      progressPercent: (xpRemaining / xpForNextLevel) * 100
    };
  };