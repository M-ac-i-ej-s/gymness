import { Timestamp } from 'firebase/firestore';

export type ExerciseType = 'COMPOUND' | 'ISOLATION';
export type TrainingGoal = 'HYPERTROPHY' | 'MAX_STRENGTH' | 'ENDURANCE';

export const EXERCISE_TYPE_META: Record<ExerciseType, { displayName: string; weightIncrement: number; description: string }> = {
  COMPOUND: {
    displayName: 'Wielostawowe',
    weightIncrement: 2.5,
    description: 'Przysiad, martwy ciąg, wyciskanie',
  },
  ISOLATION: {
    displayName: 'Izolowane',
    weightIncrement: 1,
    description: 'Biceps, barki, łydki',
  },
};

export const TRAINING_GOAL_META: Record<TrainingGoal, { displayName: string; minReps: number; maxReps: number; description: string }> = {
  HYPERTROPHY: {
    displayName: 'Hipertrofia',
    minReps: 6,
    maxReps: 12,
    description: 'Budowa masy mięśniowej (6-12 powtórzeń)',
  },
  MAX_STRENGTH: {
    displayName: 'Siła',
    minReps: 3,
    maxReps: 6,
    description: 'Siła maksymalna (3-6 powtórzeń)',
  },
  ENDURANCE: {
    displayName: 'Wytrzymałość',
    minReps: 12,
    maxReps: 20,
    description: 'Wytrzymałość mięśniowa (12-20+ powtórzeń)',
  },
};

export type Exercise = {
  id: string;
  name: string;
  type: ExerciseType;
  goal: TrainingGoal;
  targetSets: number;
  currentWeight: number;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
};

export type WorkoutSet = {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  rir: number | null;
  completedAt: Timestamp;
};

export type WorkoutSession = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  workoutId?: string;
  workoutName?: string;
  date: Timestamp;
  sets: WorkoutSet[];
  weight: number;
  goal: TrainingGoal;
  notes?: string;
  shouldIncreaseWeight?: boolean;
  averageRIR?: number | null;
};

export type Workout = {
  id: string;
  name: string;
  exerciseIds: string[];
  createdAt: Timestamp;
};

export type ActiveTrainingExercise = {
  exerciseId: string;
  exerciseName: string;
  isCompleted: boolean;
  completedAt?: Timestamp;
};

export type ActiveTraining = {
  id: string;
  workoutId: string;
  workoutName: string;
  exercises: ActiveTrainingExercise[];
  startedAt: Timestamp;
  currentExerciseId?: string;
};

export type TrainingCompletion = {
  trainingId: string;
  workoutName: string;
  exerciseCount: number;
  completedCount: number;
  exercises: Array<{ exerciseName: string; isCompleted: boolean }>;
  duration: number; // in seconds
  completedAt: Timestamp;
};

export type ProgressionRecommendation =
  | { kind: 'increase'; title: string; message: string }
  | { kind: 'decrease'; title: string; message: string }
  | { kind: 'maintain'; title: string; message: string }
  | { kind: 'consider'; title: string; message: string }
  | { kind: 'no_data'; title: string; message: string };

export type FriendStatus = 'friends' | 'pending' | 'none';

export type UserPublicProfile = {
  id: string;
  nickname?: string;
  displayName?: string;
  photoURL?: string;
};

export type Friend = {
  userId: string;
  nickname?: string;
  photoURL?: string;
  addedAt: Timestamp;
};

export type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromNickname?: string;
  fromPhotoURL?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
};

export type Impression = 'heart' | 'bicep' | 'celebration';

export type CommunityPost = {
  id: string;
  userId: string;
  nickname: string;
  photoURL?: string;
  postType: 'weight_increase' | 'training_session';
  exerciseName: string;
  weight: number;
  message: string;
  createdAt: Timestamp;
  impressions?: Record<string, Impression>; // { userId: impression }
};
