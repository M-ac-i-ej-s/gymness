import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExercisesStackParamList } from '../types/navigation';

type WorkoutsListScreenProps = NativeStackScreenProps<
  ExercisesStackParamList,
  'WorkoutsList'
>;

export const WorkoutsListScreen: React.FC<WorkoutsListScreenProps> = ({ navigation }) => {
  const { workouts, deleteWorkout, getExerciseById } = useWorkout();
  const WORKOUTS_PAGE_SIZE = 15;
  const [visibleCount, setVisibleCount] = useState(WORKOUTS_PAGE_SIZE);

  const visibleWorkouts = workouts.slice(0, visibleCount);
  const hasMoreWorkouts = visibleCount < workouts.length;

  useEffect(() => {
    setVisibleCount(WORKOUTS_PAGE_SIZE);
  }, [workouts.length]);

  const loadMoreWorkouts = () => {
    if (!hasMoreWorkouts) {
      return;
    }

    setVisibleCount((prev) => Math.min(prev + WORKOUTS_PAGE_SIZE, workouts.length));
  };

  const handleDeleteWorkout = (workoutId: string, workoutName: string) => {
    Alert.alert(
      'Usuń Zestaw',
      `Czy na pewno chcesz usunąć zestaw "${workoutName}"?`,
      [
        { text: 'Anuluj', onPress: () => {}, style: 'cancel' },
        {
          text: 'Usuń',
          onPress: async () => {
            await deleteWorkout(workoutId);
          },
          style: 'destructive',
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Zestawy ćwiczeń</Text>
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="list" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Brak Zestawów</Text>
          <Text style={styles.emptyMessage}>
            Utwórz swój pierwszy zestaw treningowy
          </Text>
          <Pressable
            onPress={() => navigation.navigate('CreateWorkout', {})}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.emptyButtonText}>Utwórz Zestaw</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleWorkouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.workoutItem}>
              <Pressable
                onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
                style={styles.workoutCard}
              >
                <View style={styles.workoutContent}>
                  <View style={styles.workoutIcon}>
                    <Ionicons name="play" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutName}>{item.name}</Text>
                    <Text style={styles.workoutDesc}>
                      {item.exerciseIds.length} ćwiczeń
                    </Text>
                  </View>
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteWorkout(item.id, item.name)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              </Pressable>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreWorkouts}
          onEndReachedThreshold={0.3}
          scrollEnabled
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
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
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonPressed: {
    opacity: 0.8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  workoutItem: {
    marginBottom: 12,
  },
  workoutCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.chip,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  workoutDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});
