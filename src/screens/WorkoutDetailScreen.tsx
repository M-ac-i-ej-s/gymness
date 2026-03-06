import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExercisesStackParamList } from '../types/navigation';
import { Exercise } from '../types/models';

type WorkoutDetailScreenProps = NativeStackScreenProps<
  ExercisesStackParamList,
  'WorkoutDetail'
>;

export const WorkoutDetailScreen: React.FC<WorkoutDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { workouts, getExerciseById, startTraining } = useWorkout();
  const { workoutId } = route.params as any;
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

  const workout = workouts.find((w) => w.id === workoutId);

  const handleStartTraining = () => {
    if (workout) {
      startTraining(workout.id, workout.name, workout.exerciseIds);
      // Generate a training ID and navigate to training session
      const trainingId = `training-${Date.now()}`;
      navigation.navigate('TrainingSession', { trainingId });
    }
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Zestaw nie znaleziony</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>
    );
  }

  const exercises: Exercise[] = workout.exerciseIds
    .map((id) => getExerciseById(id))
    .filter((ex): ex is Exercise => ex !== undefined);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{workout.name}</Text>
          <Text style={styles.headerSubtitle}>
            {exercises.length} {exercises.length === 1 ? 'ćwiczenie' : 'ćwiczeń'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="barbell" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Brak Ćwiczeń</Text>
          <Text style={styles.emptyMessage}>Ten zestaw nie zawiera żadnych ćwiczeń</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={exercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExerciseItemCard
                exercise={item}
                onPress={() =>
                  navigation.navigate('ExerciseDetail', { exerciseId: item.id })
                }
              />
            )}
            contentContainerStyle={styles.listContent}
            scrollEnabled
          />
          <View style={styles.footer}>
            <Pressable
              onPress={() => navigation.navigate('CreateWorkout', { workoutId: workout.id })}
              style={styles.startButton}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.startButtonText}>Dodaj Ćwiczenie</Text>
            </Pressable>
            <Pressable
              onPress={handleStartTraining}
              style={styles.startButton}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.startButtonText}>Rozpocznij Trening</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

const ExerciseItemCard: React.FC<{
  exercise: Exercise;
  onPress: () => void;
}> = ({ exercise, onPress }) => {
  return (
    <View style={styles.exerciseItem}>
      <Pressable onPress={onPress} style={styles.exerciseCard}>
        <View style={styles.exerciseContent}>
          <View style={styles.exerciseLeft}>
            <View style={[styles.exerciseIcon]}>
              <Ionicons 
                name="barbell" 
                size={20} 
                color={colors.primary} 
              />
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={styles.exerciseName}>
                {exercise.name}
              </Text>
              <Text style={styles.exerciseDesc}>
                {exercise.targetSets} serie × {exercise.currentWeight} kg
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
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
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
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
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  exerciseDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.chip,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  startButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});
