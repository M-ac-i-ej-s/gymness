import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExercisesStackParamList } from '../types/navigation';

type TrainingCompletionScreenProps = NativeStackScreenProps<
  ExercisesStackParamList,
  'TrainingCompletion'
>;

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

export const TrainingCompletionScreen: React.FC<TrainingCompletionScreenProps> = ({
  navigation,
  route,
}) => {
  const {
    trainingId,
    duration: routeDuration,
    completedCount: routeCompletedCount,
    totalCount: routeTotalCount,
    exercises: routeExercises,
  } = route.params;
  const { activeTraining, fetchRecentSessions } = useWorkout();
  const [duration, setDuration] = useState(0);

  // Prefer stable summary from route params. Fallback to active training if needed.
  useEffect(() => {
    if (typeof routeDuration === 'number') {
      setDuration(routeDuration);
      return;
    }

    if (activeTraining?.id === trainingId) {
      const startTime = activeTraining.startedAt.toMillis();
      const now = Date.now();
      const secondsElapsed = Math.floor((now - startTime) / 1000);
      setDuration(secondsElapsed);
    }
  }, [activeTraining, routeDuration, trainingId]);

  const exercises = routeExercises ?? activeTraining?.exercises ?? [];
  const completedCount =
    typeof routeCompletedCount === 'number'
      ? routeCompletedCount
      : exercises.filter((e) => e.isCompleted).length;
  const totalCount = typeof routeTotalCount === 'number' ? routeTotalCount : exercises.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleFinish = async () => {
    await fetchRecentSessions();
    navigation.popToTop();
    navigation.navigate('WorkoutsList' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={60} color={colors.primary} />
        <Text style={styles.congratsText}>Gratulacje!</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Czas Treningu</Text>
          <Text style={styles.statValue}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardSmall]}>
            <Text style={styles.statLabel}>Ćwiczenia</Text>
            <Text style={styles.statValue}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={[styles.statCard, styles.statCardSmall]}>
            <Text style={styles.statLabel}>Ukończone</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {totalCount > 0 && completedCount === totalCount ? '100%' : `${completionPercent}%`}
            </Text>
          </View>
        </View>

        {exercises.length > 0 && (
          <View style={styles.exercisesSection}>
            <Text style={styles.sectionTitle}>Szczegóły Ćwiczeń</Text>
            {exercises.map((exercise, index) => (
              <View key={exercise.exerciseId} style={styles.exerciseItem}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                  <Text style={styles.exerciseStatus}>
                    {exercise.isCompleted ? '✓ Ukończone' : '⊘ Nie ukończone'}
                  </Text>
                </View>
                <Ionicons
                  name={exercise.isCompleted ? 'checkmark-circle' : 'close-circle'}
                  size={24}
                  color={exercise.isCompleted ? colors.success : colors.danger}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.encouragement}>
          <Text style={styles.encouragementText}>
            {completedCount === totalCount
              ? '🔥 Świetna robota! Wszystkie ćwiczenia ukończone!'
              : completedCount > 0
                ? '💪 Dobra robota! Kontynuuj treningi!'
                : 'Następnym razem będzie lepiej!'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={handleFinish} style={styles.finishButton}>
          <Text style={styles.finishButtonText}>Powrót do Zestawów</Text>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    gap: 12,
  },
  congratsText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardSmall: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  exercisesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseNumberText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  exerciseStatus: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  encouragement: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  encouragementText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
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
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});
