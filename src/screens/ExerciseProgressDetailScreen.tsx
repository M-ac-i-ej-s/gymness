import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { Exercise, WorkoutSession } from '../types/models';
import { formatDate, formatKg } from '../utils/format';
import { StatCard, ModernCard } from '../components/Cards';
import { ExercisesStackParamList, UserStackParamList } from '../types/navigation';

type Props = 
  | NativeStackScreenProps<ExercisesStackParamList, 'ExerciseProgressDetail'>
  | NativeStackScreenProps<UserStackParamList, 'ExerciseProgressDetail'>;

export const ExerciseProgressDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { exercises, fetchWorkoutSessions } = useWorkout();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const selectedExercise = exercises.find((e) => e.id === route.params.exerciseId);
    setExercise(selectedExercise || null);
  }, [exercises, route.params.exerciseId]);

  useEffect(() => {
    if (!exercise) return;
    const load = async () => {
      const data = await fetchWorkoutSessions(exercise);
      setSessions(data.reverse());
    };
    load();
  }, [exercise, fetchWorkoutSessions]);

  useFocusEffect(
    React.useCallback(() => {
      if (exercise) {
        const load = async () => {
          const data = await fetchWorkoutSessions(exercise);
          setSessions(data.reverse());
        };
        load();
      }
    }, [exercise, fetchWorkoutSessions])
  );

  const onRefresh = async () => {
    if (!exercise) return;
    setRefreshing(true);
    const data = await fetchWorkoutSessions(exercise);
    setSessions(data.reverse());
    setRefreshing(false);
  };

  if (!exercise) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Progres</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Ćwiczenie nie znalezione</Text>
        </View>
      </View>
    );
  }

  const weightIncrease =
    sessions.length >= 2 ? sessions[sessions.length - 1].weight - sessions[0].weight : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Progres</Text>
          <Text style={styles.headerSubtitle}>{exercise.name}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Obecny ciężar"
            value={exercise.currentWeight.toFixed(1)}
            unit="kg"
            background={`${colors.primary}15`}
          />
          <StatCard
            title="Całkowity wzrost"
            value={(weightIncrease > 0 ? '+' : '') + weightIncrease.toFixed(1)}
            unit="kg"
            background={weightIncrease > 0 ? '#DCFCE7' : '#F3F4F6'}
          />
        </View>

        {/* Sessions List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ostatnie wpisy</Text>
          {sessions.length === 0 ? (
            <Text style={styles.emptyText}>Brak treningów</Text>
          ) : (
            <FlatList
              data={sessions.slice(0, 10)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ModernCard>
                  <View style={styles.sessionItemRow}>
                    <View>
                      <Text style={styles.sessionItemDate}>{formatDate(item.date.toDate())}</Text>
                      {item.workoutName && (
                        <Text style={styles.sessionItemWorkout}>{item.workoutName}</Text>
                      )}
                      <Text style={styles.sessionItemReps}>{item.sets.map((s) => s.reps).join(' / ')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.sessionItemWeight}>{formatKg(item.weight)}</Text>
                      <Text style={styles.sessionItemVolume}>Vol: {(item.sets.reduce((acc, s) => acc + s.reps * s.weight, 0)).toFixed(0)} kg</Text>
                    </View>
                  </View>
                </ModernCard>
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  statsContainer: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  sessionItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionItemDate: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionItemWorkout: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  sessionItemReps: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sessionItemWeight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sessionItemVolume: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
