import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { WorkoutSession } from '../types/models';
import { formatDate, formatKg } from '../utils/format';
import { ModernCard, StatCard } from '../components/Cards';
import { analyzeProgression } from '../utils/progression';

interface ExerciseDetailScreenProps {
  exerciseId: string;
  onStartWorkout: () => void;
  onBack: () => void;
}

export const ExerciseDetailScreen: React.FC<ExerciseDetailScreenProps> = ({
  exerciseId,
  onStartWorkout,
  onBack,
}) => {
  const { getExerciseById, observeWorkoutSessions, activeTraining } = useWorkout();
  const exercise = getExerciseById(exerciseId);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  // Check if this exercise is in the active training
  const isInActiveTraining = activeTraining?.exercises.some(ex => ex.exerciseId === exerciseId) ?? false;

  useEffect(() => {
    if (!exercise) return;
    const unsubscribe = observeWorkoutSessions(exerciseId, setSessions);
    return unsubscribe;
  }, [exerciseId, exercise]);

  if (!exercise) return null;

  const recommendation = analyzeProgression(sessions, exercise);
  const recommendationColors = {
    increase: { bg: '#D1FAE5', text: '#065F46' },
    decrease: { bg: '#FEE2E2', text: '#7F1D1D' },
    maintain: { bg: '#DDD6FE', text: '#3730A3' },
    consider: { bg: '#FEF3C7', text: '#92400E' },
    no_data: { bg: '#F3F4F6', text: '#374151' },
  };

  const recColors = recommendationColors[recommendation.kind];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{exercise.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Recommendation Card */}
        <View style={[styles.recommendationCard, { backgroundColor: recColors.bg }]}>
          <Text style={[styles.recTitle, { color: recColors.text }]}>{recommendation.title}</Text>
          <Text style={[styles.recMessage, { color: recColors.text }]}>{recommendation.message}</Text>
        </View>

        {/* Main Stats */}
        <View style={styles.statsRow}>
          <StatCard
            title="Aktualny ciężar"
            value={exercise.currentWeight.toFixed(1)}
            unit="kg"
            background={`${colors.primary}15`}
          />
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statSmall}>
            <Text style={styles.statSmallLabel}>Serie</Text>
            <Text style={styles.statSmallValue}>{exercise.targetSets}</Text>
          </View>
          <View style={styles.statSmall}>
            <Text style={styles.statSmallLabel}>Powtórzenia</Text>
            <Text style={styles.statSmallValue}>6-12</Text>
          </View>
        </View>

        {/* Active Training Warning */}
        {isInActiveTraining && (
          <View style={styles.warningCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.warningText}>To ćwiczenie jest częścią aktywnego treningu</Text>
          </View>
        )}

        {/* Recent Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ostatnie Treningi</Text>
          {sessions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="time-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyHistoryText}>Brak historii treningów</Text>
            </View>
          ) : (
            <FlatList
              data={sessions.slice(0, 10)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ModernCard style={styles.sessionCard}>
                  <View style={styles.sessionRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionDate}>{formatDate(item.date.toDate())}</Text>
                      <Text style={styles.sessionReps}>{item.sets.map((s) => s.reps).join(' / ')}</Text>
                      {item.shouldIncreaseWeight && (
                        <View style={styles.progressTag}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                          <Text style={styles.progressTagText}>Progresja osiągnięta</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.sessionWeight}>{formatKg(item.weight)}</Text>
                      {item.averageRIR && (
                        <Text style={styles.sessionRir}>W zapasie: {item.averageRIR.toFixed(1)}</Text>
                      )}
                    </View>
                  </View>
                </ModernCard>
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {!isInActiveTraining && (
        <View style={styles.floatingButton}>
          <Pressable
            onPress={onStartWorkout}
            style={styles.startWorkoutButton}
          >
            <Ionicons name="play" size={20} color="white" />
            <Text style={styles.startWorkoutButtonText}>Rozpocznij Trening</Text>
          </Pressable>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  recommendationCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  recTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  recMessage: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statSmall: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statSmallLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statSmallValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  warningCard: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  section: {
    marginBottom: 120,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  sessionCard: {
    padding: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionDate: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionReps: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  progressTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  progressTagText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  sessionWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sessionRir: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyHistoryText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  startWorkoutButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startWorkoutButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
});
