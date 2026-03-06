import { EXERCISE_TYPE_META, TRAINING_GOAL_META, Exercise, ProgressionRecommendation, WorkoutSession, WorkoutSet } from '../types/models';

export const shouldIncreaseWeight = (sets: WorkoutSet[], goalKey: Exercise['goal']) => {
  if (!sets.length) return false;

  const upperLimit = TRAINING_GOAL_META[goalKey].maxReps;
  const allSetsAtMax = sets.every((set) => set.reps >= upperLimit);
  const goodIntensity = sets.every((set) => set.rir == null || set.rir <= 1);

  return allSetsAtMax && goodIntensity;
};

export const nextWeight = (exercise: Exercise) => {
  const increment = EXERCISE_TYPE_META[exercise.type].weightIncrement;
  return exercise.currentWeight + increment;
};

export const progressionStatus = (sets: WorkoutSet[]) => sets.map((set) => set.reps).join(' / ');

export const totalVolume = (sets: WorkoutSet[]) => sets.reduce((acc, set) => acc + set.reps * set.weight, 0);

export const averageRir = (sets: WorkoutSet[]) => {
  const values = sets.filter((set) => set.rir != null).map((set) => Number(set.rir));
  if (!values.length) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

export const analyzeProgression = (
  sessions: WorkoutSession[],
  exercise: Exercise,
): ProgressionRecommendation => {
  const last = sessions[0];
  if (!last) {
    return { kind: 'no_data', title: '📊 Brak danych', message: 'Wykonaj pierwszy trening' };
  }

  if (shouldIncreaseWeight(last.sets, exercise.goal)) {
    const increment = EXERCISE_TYPE_META[exercise.type].weightIncrement;
    const to = nextWeight(exercise);
    const pct = exercise.currentWeight > 0 ? (increment / exercise.currentWeight) * 100 : 0;
    return {
      kind: 'increase',
      title: '🎉 Zwiększ ciężar!',
      message: `Zwiększ z ${exercise.currentWeight.toFixed(1)} kg do ${to.toFixed(1)} kg (+${pct.toFixed(1)}%)`,
    };
  }

  const goalMeta = TRAINING_GOAL_META[exercise.goal];
  const lastSet = last.sets[last.sets.length - 1];

  if (lastSet) {
    if (lastSet.reps < goalMeta.minReps) {
      return { kind: 'decrease', title: '⚠️ Zmniejsz ciężar', message: 'Liczba powtórzeń poniżej celu' };
    }
    if (lastSet.reps >= goalMeta.minReps && lastSet.reps < goalMeta.maxReps) {
      return {
        kind: 'maintain',
        title: '✅ Kontynuuj',
        message: `Kontynuuj progresję do ${goalMeta.maxReps} powtórzeń`,
      };
    }
  }

  const avgRir = averageRir(last.sets);
  if (avgRir != null && avgRir >= 3) {
    return {
      kind: 'consider',
      title: '💡 Rozważ zwiększenie',
      message: 'RIR wskazuje na zbyt lekki ciężar',
    };
  }

  return { kind: 'maintain', title: '✅ Kontynuuj', message: 'Kontynuuj obecny ciężar' };
};
