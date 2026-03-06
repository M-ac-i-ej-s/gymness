import React, { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { repository } from '../services/repository';
import { useAuth } from './AuthContext';
import { EXERCISE_TYPE_META, Exercise, ExerciseType, ActiveTraining, ProgressionRecommendation, TRAINING_GOAL_META, TrainingGoal, Workout, WorkoutSession, WorkoutSet } from '../types/models';
import { analyzeProgression, nextWeight, shouldIncreaseWeight } from '../utils/progression';

type WorkoutContextValue = {
  exercises: Exercise[];
  workouts: Workout[];
  recentSessions: WorkoutSession[];
  activeTraining: ActiveTraining | null;
  isLoading: boolean;
  errorMessage: string | null;
  clearError: () => void;
  getExerciseById: (id: string) => Exercise | undefined;
  createExercise: (payload: {
    name: string;
    type: ExerciseType;
    goal: TrainingGoal;
    targetSets: number;
    startingWeight: number;
  }) => Promise<void>;
  deleteExercise: (exercise: Exercise) => Promise<void>;
  createWorkout: (name: string, exerciseIds: string[]) => Promise<void>;
  updateWorkout: (workoutId: string, name: string, exerciseIds: string[]) => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<void>;
  createWorkoutSession: (exercise: Exercise, sets: WorkoutSet[], notes?: string, workoutId?: string, workoutName?: string) => Promise<void>;
  observeWorkoutSessions: (exerciseId: string, callback: (rows: WorkoutSession[]) => void) => () => void;
  fetchWorkoutSessions: (exercise: Exercise) => Promise<WorkoutSession[]>;
  fetchRecentSessions: () => Promise<void>;
  getProgressionRecommendation: (exercise: Exercise) => Promise<ProgressionRecommendation>;
  startTraining: (workoutId: string, workoutName: string, exerciseIds: string[]) => void;
  completeExerciseInTraining: (exerciseId: string) => void;
  setCurrentExerciseInTraining: (exerciseId: string) => void;
  finishTraining: () => Promise<{ completedExercises: number; totalExercises: number; exercises: any[] }>;
  cancelTraining: () => void;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

const fallbackError = 'Wystąpił nieoczekiwany błąd';

export const WorkoutProvider = ({ children }: PropsWithChildren) => {
  const { user, userProfile } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [activeTraining, setActiveTraining] = useState<ActiveTraining | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const createExercise: WorkoutContextValue['createExercise'] = useCallback(async ({
    name,
    type,
    goal,
    targetSets,
    startingWeight,
  }) => {
    if (!user) return;

    setIsLoading(true);
    try {
      await repository.createExercise(user.uid, {
        name,
        type,
        goal,
        targetSets,
        currentWeight: startingWeight,
      });
    } catch (error: any) {
      setErrorMessage(`Błąd tworzenia ćwiczenia: ${error.message ?? fallbackError}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const deleteExercise = useCallback(async (exercise: Exercise) => {
    if (!user) return;

    setIsLoading(true);
    try {
      await repository.deleteExercise(user.uid, exercise.id);
    } catch (error: any) {
      setErrorMessage(`Błąd usuwania ćwiczenia: ${error.message ?? fallbackError}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createWorkout = useCallback(async (name: string, exerciseIds: string[]) => {
    if (!user) return;

    setIsLoading(true);
    try {
      await repository.createWorkout(user.uid, name, exerciseIds);
    } catch (error: any) {
      setErrorMessage(`Błąd tworzenia zestawu: ${error.message ?? fallbackError}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateWorkout = useCallback(async (workoutId: string, name: string, exerciseIds: string[]) => {
    if (!user) return;

    setIsLoading(true);
    try {
      await repository.updateWorkout(user.uid, workoutId, name, exerciseIds);
    } catch (error: any) {
      setErrorMessage(`Błąd aktualizacji zestawu: ${error.message ?? fallbackError}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const deleteWorkout = useCallback(async (workoutId: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      await repository.deleteWorkout(user.uid, workoutId);
    } catch (error: any) {
      setErrorMessage(`Błąd usuwania zestawu: ${error.message ?? fallbackError}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchRecentSessions = useCallback(async () => {
    if (!user) {
      setRecentSessions([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await repository.fetchRecentWorkoutSessions(user.uid);
      setRecentSessions(rows);
    } catch (error: any) {
      console.error('❌ Error fetching recent sessions:', error);
      setErrorMessage(`Błąd pobierania historii: ${error.message ?? fallbackError}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createWorkoutSession = useCallback(async (exercise: Exercise, sets: WorkoutSet[], notes?: string, workoutId?: string, workoutName?: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Ensure we have exercise data and a valid name
      if (!exercise?.id || !exercise?.name) {
        throw new Error('Brakuje danych ćwiczenia');
      }

      await repository.createWorkoutSession(user.uid, {
        exerciseId: exercise.id,
        exerciseName: exercise.name || 'Nieznane ćwiczenie',
        workoutId,
        workoutName,
        sets,
        weight: exercise.currentWeight,
        goal: exercise.goal,
        notes,
      });

      if (shouldIncreaseWeight(sets, exercise.goal)) {
        await repository.updateExerciseWeight(user.uid, exercise.id, nextWeight(exercise));
      }

      // Refresh recent sessions to update history immediately
      await fetchRecentSessions();
    } catch (error: any) {
      console.error('❌ Error in createWorkoutSession:', error);
      setErrorMessage(`Błąd zapisywania treningu: ${error.message ?? fallbackError}`);
    } finally {
      setIsLoading(false);
    }
  }, [fetchRecentSessions, user]);

  const observeWorkoutSessions: WorkoutContextValue['observeWorkoutSessions'] = useCallback((exerciseId, callback) => {
    if (!user) {
      callback([]);
      return () => {};
    }

    return repository.observeWorkoutSessions(
      user.uid,
      exerciseId,
      callback,
      (error) => setErrorMessage(`Błąd pobierania treningów: ${error.message ?? fallbackError}`),
    );
  }, [user]);

  const fetchWorkoutSessions = useCallback(async (exercise: Exercise) => {
    if (!user) return [];

    try {
      return await repository.fetchWorkoutSessions(user.uid, exercise.id);
    } catch (error: any) {
      setErrorMessage(`Błąd pobierania treningów: ${error.message ?? fallbackError}`);
      return [];
    }
  }, [user]);

  const getProgressionRecommendation = useCallback(async (exercise: Exercise) => {
    const sessions = await fetchWorkoutSessions(exercise);
    return analyzeProgression(sessions, exercise);
  }, [fetchWorkoutSessions]);

  const getExerciseById = useCallback((id: string) => exercises.find((exercise) => exercise.id === id), [exercises]);

  const startTraining = useCallback((workoutId: string, workoutName: string, exerciseIds: string[]) => {
    const trainingId = `training-${Date.now()}`;
    
    // Ensure we have exercise data before starting
    const trainingExercises = exerciseIds.map(id => {
      const exercise = exercises.find(e => e.id === id);
      return {
        exerciseId: id,
        exerciseName: exercise?.name || `Ćwiczenie ${id.substring(0, 4)}`,
        isCompleted: false,
      };
    });

    const newTraining: ActiveTraining = {
      id: trainingId,
      workoutId,
      workoutName,
      exercises: trainingExercises,
      startedAt: Timestamp.now(),
      currentExerciseId: exerciseIds[0],
    };
    setActiveTraining(newTraining);
  }, [exercises]);

  const completeExerciseInTraining = useCallback((exerciseId: string) => {
    setActiveTraining(prev => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map(ex => 
          ex.exerciseId === exerciseId 
            ? { ...ex, isCompleted: true, completedAt: Timestamp.now() }
            : ex
        ),
      };
    });
  }, []);

  const setCurrentExerciseInTraining = useCallback((exerciseId: string) => {
    setActiveTraining(prev => {
      if (!prev) return null;
      return { ...prev, currentExerciseId: exerciseId };
    });
  }, []);

  const finishTraining = useCallback(async () => {
    if (!activeTraining || !user) return { completedExercises: 0, totalExercises: 0, exercises: [] };

    const completedExercises = activeTraining.exercises.filter(e => e.isCompleted);
    setActiveTraining(null);

    return {
      completedExercises: completedExercises.length,
      totalExercises: activeTraining.exercises.length,
      exercises: activeTraining.exercises,
    };
  }, [activeTraining, user]);

  const cancelTraining = useCallback(() => {
    setActiveTraining(null);
  }, []);

  React.useEffect(() => {
    if (!user) {
      setExercises([]);
      setWorkouts([]);
      setRecentSessions([]);
      setActiveTraining(null);
      return;
    }

    const unsubscribeExercises = repository.observeExercises(
      user.uid,
      setExercises,
      (error) => setErrorMessage(`Błąd pobierania ćwiczeń: ${error.message ?? fallbackError}`),
    );

    const unsubscribeWorkouts = repository.observeWorkouts(
      user.uid,
      setWorkouts,
      (error) => setErrorMessage(`Błąd pobierania zestawów: ${error.message ?? fallbackError}`),
    );

    // Load recent sessions on mount
    fetchRecentSessions();

    return () => {
      unsubscribeExercises();
      unsubscribeWorkouts();
    };
  }, [fetchRecentSessions, user]);

  const value = useMemo<WorkoutContextValue>(
    () => ({
      exercises,
      workouts,
      recentSessions,
      activeTraining,
      isLoading,
      errorMessage,
      clearError,
      getExerciseById,
      createExercise,
      deleteExercise,
      createWorkout,
      updateWorkout,
      deleteWorkout,
      createWorkoutSession,
      observeWorkoutSessions,
      fetchWorkoutSessions,
      fetchRecentSessions,
      getProgressionRecommendation,
      startTraining,
      completeExerciseInTraining,
      setCurrentExerciseInTraining,
      finishTraining,
      cancelTraining,
    }),
    [
      exercises,
      workouts,
      recentSessions,
      activeTraining,
      isLoading,
      errorMessage,
      clearError,
      getExerciseById,
      createExercise,
      deleteExercise,
      createWorkout,
      updateWorkout,
      deleteWorkout,
      createWorkoutSession,
      observeWorkoutSessions,
      fetchWorkoutSessions,
      fetchRecentSessions,
      getProgressionRecommendation,
      startTraining,
      completeExerciseInTraining,
      setCurrentExerciseInTraining,
      finishTraining,
      cancelTraining,
    ],
  );

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used inside WorkoutProvider');
  }
  return context;
};

export const createWorkoutSet = (setNumber: number, reps: number, weight: number, rir: number | null): WorkoutSet => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  setNumber,
  reps,
  weight,
  rir,
  completedAt: Timestamp.now(),
});

export const getGoalRangeText = (goal: TrainingGoal) => {
  const meta = TRAINING_GOAL_META[goal];
  return `${meta.minReps}-${meta.maxReps}`;
};

export const getExerciseIncrementText = (type: ExerciseType) => `+${EXERCISE_TYPE_META[type].weightIncrement} kg`;
