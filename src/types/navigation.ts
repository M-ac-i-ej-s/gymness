export type ExercisesStackParamList = {
  ExerciseListMain: undefined;
  ExerciseDetail: { exerciseId: string };
  WorkoutSession: { exerciseId: string; workoutId?: string; completedExerciseIds?: string[] };
  WorkoutsList: undefined;
  CreateWorkout: { workoutId?: string };
  WorkoutDetail: { workoutId: string; completedExerciseId?: string; completedExerciseIds?: string[] };
  TrainingSession: { trainingId: string };
  TrainingCompletion: {
    trainingId: string;
    workoutName: string;
    duration: number;
    completedCount: number;
    totalCount: number;
    exercises: Array<{ exerciseId: string; exerciseName: string; isCompleted: boolean }>;
  };
  ProgressMain: undefined;
  ExerciseProgressDetail: { exerciseId: string };
};

export type RootTabParamList = {
  ExercisesTab: undefined;
  WorkoutsTab: undefined;
  CommunityTab: undefined;
  UserTab: undefined;
};

export type UserStackParamList = {
  UserPanel: undefined;
  RecentWorkouts: undefined;
  ProgressMain: undefined;
  ExerciseProgressDetail: { exerciseId: string };
  FindUsers: undefined;
};

export type CommunityStackParamList = {
  CommunityMain: undefined;
  CommunityLeaderboard: {
    exerciseKey: string;
    exerciseName: string;
  };
};

export type AuthStackParamList = {
  AuthMenu: undefined;
  SignUp: undefined;
  VerifyAccount: { email: string };
};
