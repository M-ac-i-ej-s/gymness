import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExercisesStackParamList } from '../types/navigation';
import { Exercise } from '../types/models';

type TrainingSessionScreenProps = NativeStackScreenProps<
  ExercisesStackParamList,
  'TrainingSession'
>;

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const TrainingSessionScreen: React.FC<TrainingSessionScreenProps> = ({
  navigation,
}) => {
  const { activeTraining, getExerciseById, completeExerciseInTraining, setCurrentExerciseInTraining, finishTraining, cancelTraining } = useWorkout();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!activeTraining) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Training session not found</Text>
      </View>
    );
  }

  const exercises: Exercise[] = activeTraining.exercises
    .map((ex) => getExerciseById(ex.exerciseId))
    .filter((ex): ex is Exercise => ex !== undefined);

  const handleFinishTraining = async () => {
    Alert.alert(
      'Zakończ Trening',
      `Czy na pewno chcesz zakończyć trening?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Zakończ',
          onPress: async () => {
            const trainingSnapshot = activeTraining;
            const completedCount = trainingSnapshot.exercises.filter((exercise) => exercise.isCompleted).length;
            const totalCount = trainingSnapshot.exercises.length;
            const duration = Math.max(0, Math.floor((Date.now() - trainingSnapshot.startedAt.toMillis()) / 1000));

            await finishTraining();
            navigation.navigate('TrainingCompletion', {
              trainingId: trainingSnapshot.id,
              workoutName: trainingSnapshot.workoutName,
              duration,
              completedCount,
              totalCount,
              exercises: trainingSnapshot.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                isCompleted: exercise.isCompleted,
              })),
            });
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleCancelTraining = () => {
    Alert.alert(
      'Anuluj Trening',
      'Czy na pewno chcesz anulować trening?',
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak',
          onPress: () => {
            cancelTraining();
            navigation.goBack();
          },
          style: 'destructive',
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleCancelTraining} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{activeTraining.workoutName}</Text>
          <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const trainingEx = activeTraining.exercises.find(ex => ex.exerciseId === item.id);
          const isCompleted = trainingEx?.isCompleted ?? false;
          const isCurrent = activeTraining.currentExerciseId === item.id;

          return (
            <View style={styles.exerciseItem}>
              <Pressable
                onPress={() => {
                  if (isCompleted) {
                    return;
                  }

                  setCurrentExerciseInTraining(item.id);
                  navigation.push('WorkoutSession', {
                    exerciseId: item.id,
                    workoutId: activeTraining.workoutId,
                  });
                }}
                style={[
                  styles.exerciseCard,
                  isCurrent && styles.exerciseCardSelected,
                  isCompleted && styles.exerciseCardCompleted,
                ]}
              >
                <View style={styles.exerciseContent}>
                  <View style={styles.exerciseLeft}>
                    <View
                      style={[
                        styles.exerciseIcon,
                        isCompleted && styles.completedIcon,
                        isCurrent && styles.currentIcon,
                      ]}
                    >
                      <Ionicons
                        name={isCompleted ? 'checkmark' : 'barbell'}
                        size={20}
                        color={isCompleted ? colors.success : isCurrent ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={[styles.exerciseName, isCompleted && styles.completedText]}>
                        {item.name}
                        {isCompleted && ' ✓'}
                      </Text>
                      <Text style={styles.exerciseDesc}>
                        {item.targetSets} serie × {item.currentWeight} kg
                      </Text>
                    </View>
                  </View>
                  {isCurrent && !isCompleted && (
                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                  )}
                </View>
              </Pressable>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        scrollEnabled
      />

      <View style={styles.footer}>
        <Pressable onPress={handleFinishTraining} style={styles.finishButton}>
          <Ionicons name="checkmark-done" size={20} color="white" />
          <Text style={styles.finishButtonText}>Zakończ Trening</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  exerciseItem: {
    marginBottom: 12,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: `${colors.primary}08`,
  },
  exerciseCardCompleted: {
    opacity: 0.7,
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.chip,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  completedIcon: {
    backgroundColor: `${colors.success}20`,
  },
  currentIcon: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  completedText: {
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
  exerciseDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  finishButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  errorText: {
    fontSize: 16,
    color: colors.text,
  },
});
