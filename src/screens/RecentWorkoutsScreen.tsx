import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { WorkoutSession } from '../types/models';
import { formatDate, formatTime, formatKg } from '../utils/format';
import { ModernCard } from '../components/Cards';
import { UserStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<UserStackParamList, 'RecentWorkouts'>;

export const RecentWorkoutsScreen: React.FC<Props> = ({ navigation }) => {
  const { recentSessions, isLoading, fetchRecentSessions } = useWorkout();
  const DATE_SECTION_PAGE_SIZE = 5;

  const [refreshing, setRefreshing] = useState(false);
  const [visibleDateSections, setVisibleDateSections] = useState(DATE_SECTION_PAGE_SIZE);

  useEffect(() => {
    fetchRecentSessions();
  }, [fetchRecentSessions]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchRecentSessions();
    }, [fetchRecentSessions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecentSessions();
    setRefreshing(false);
  };

  const groupedByDateAndWorkout = recentSessions.reduce(
    (acc, session) => {
      const dateKey = formatDate(session.date.toDate());
      const workoutKey = session.workoutName || 'Niezaplanowane ćwiczenia';
      
      if (!acc[dateKey]) acc[dateKey] = {};
      if (!acc[dateKey][workoutKey]) acc[dateKey][workoutKey] = [];
      acc[dateKey][workoutKey].push(session);
      return acc;
    },
    {} as Record<string, Record<string, WorkoutSession[]>>,
  );

  const sortedDates = Object.keys(groupedByDateAndWorkout).sort((a, b) => {
    const dateMap: Record<string, number> = { Dzisiaj: 0, Wczoraj: 1 };
    const aVal = dateMap[a] ?? 2;
    const bVal = dateMap[b] ?? 2;
    return aVal - bVal;
  });

  useEffect(() => {
    setVisibleDateSections(DATE_SECTION_PAGE_SIZE);
  }, [recentSessions.length]);

  const visibleDates = sortedDates.slice(0, visibleDateSections);
  const hasMoreDateSections = visibleDateSections < sortedDates.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Historia treningów</Text>
      </View>

      {isLoading && recentSessions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : recentSessions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar" size={54} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Brak treningów</Text>
          <Text style={styles.emptyMessage}>Twoje treningi pojawią się tutaj</Text>
        </View>
      ) : (
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
          {visibleDates.map((dateKey) => (
            <View key={dateKey} style={styles.section}>
              <Text style={styles.dateHeader}>{dateKey}</Text>
              {Object.entries(groupedByDateAndWorkout[dateKey]).map(([workoutName, sessions]) => (
                <View 
                  key={`${dateKey}-${workoutName}`} 
                  style={[
                    styles.workoutGroup,
                    workoutName !== 'Niezaplanowane ćwiczenia' && styles.workoutGroupTraining
                  ]}
                >
                  {workoutName !== 'Niezaplanowane ćwiczenia' && (
                    <Text style={styles.workoutName}>{workoutName}</Text>
                  )}
                  {sessions.map((session) => (
                    <SessionCard 
                      key={session.id} 
                      session={session}
                    />
                  ))}
                </View>
              ))}
            </View>
          ))}

          {hasMoreDateSections && (
            <Pressable
              style={styles.loadMoreButton}
              onPress={() =>
                setVisibleDateSections((prev) => Math.min(prev + DATE_SECTION_PAGE_SIZE, sortedDates.length))
              }
            >
              <Text style={styles.loadMoreButtonText}>Załaduj więcej dni</Text>
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
            </Pressable>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const SessionCard: React.FC<{ session: WorkoutSession }> = ({ session }) => (
  <ModernCard style={styles.sessionCard}>
    <View style={styles.sessionCardRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.sessionCardHeader}>
          <Text style={styles.sessionExerciseName}>{session.exerciseName}</Text>
          <Text style={styles.sessionTime}>{formatTime(session.date.toDate())}</Text>
        </View>

        <View style={styles.sessionCardStats}>
          <View style={styles.statItem}>
            <Ionicons name="barbell" size={14} color={colors.primary} />
            <Text style={styles.statItemText}>{formatKg(session.weight)}</Text>
          </View>
          <Text style={styles.statItemText}>{session.sets.length} serie</Text>
        </View>

        <Text style={styles.sessionReps}>Powtórzenia: {session.sets.map((s) => s.reps).join(' / ')}</Text>

        {session.averageRIR && (
          <View style={styles.rirBadge}>
            <Text style={styles.rirBadgeText}>RIR: {session.averageRIR.toFixed(1)}</Text>
          </View>
        )}

        {session.shouldIncreaseWeight && (
          <View style={styles.progressBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.progressBadgeText}>Cel osiągnięty - zwiększono ciężar</Text>
          </View>
        )}
      </View>
    </View>
  </ModernCard>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  workoutGroup: {
    marginBottom: 16,
  },
  workoutGroupTraining: {
    backgroundColor: `${colors.primary}08`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  workoutName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
  },
  sessionCard: {
    marginBottom: 8,
    padding: 12,
  },
  sessionCardRow: {
    flexDirection: 'row',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionExerciseName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sessionTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sessionCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItemText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  sessionReps: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  rirBadge: {
    backgroundColor: colors.chip,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  rirBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  loadMoreButton: {
    marginTop: 4,
    marginBottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadMoreButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
