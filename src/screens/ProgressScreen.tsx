import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { Exercise } from '../types/models';
import { formatKg } from '../utils/format';
import { ModernCard } from '../components/Cards';
import { ExercisesStackParamList, UserStackParamList } from '../types/navigation';

type Props = 
  | NativeStackScreenProps<ExercisesStackParamList, 'ProgressMain'>
  | NativeStackScreenProps<UserStackParamList, 'ProgressMain'>;

export const ProgressScreen: React.FC<Props> = (props) => {
  const { navigation } = props;
  const { exercises } = useWorkout();

  const handleNavigate = (exerciseId: string) => {
    (navigation as any).navigate('ExerciseProgressDetail', { exerciseId });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Mój Progres</Text>
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ModernCard onPress={() => handleNavigate(item.id)}>
            <View style={styles.exerciseRow}>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{item.name}</Text>
              </View>
              <View style={styles.exerciseWeight}>
                <Text style={styles.exerciseWeightText}>{formatKg(item.currentWeight)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 12 }} />
            </View>
          </ModernCard>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="analytics" size={54} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Brak ćwiczeń</Text>
            <Text style={styles.emptyMessage}>Dodaj ćwiczenia aby śledzić progres</Text>
          </View>
        }
      />
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
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseWeight: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  exerciseWeightText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
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
});
