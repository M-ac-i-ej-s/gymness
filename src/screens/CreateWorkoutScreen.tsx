import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  FlatList,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout } from '../store/WorkoutContext';
import { SegmentedControl } from '../components/SegmentedControl';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExercisesStackParamList } from '../types/navigation';
import { ExerciseType, TrainingGoal, EXERCISE_TYPE_META, TRAINING_GOAL_META } from '../types/models';

type CreateWorkoutScreenProps = NativeStackScreenProps<
  ExercisesStackParamList,
  'CreateWorkout'
>;

interface GroupedExercise {
  title: string;
  data: Array<{ id: string; name: string; goal: TrainingGoal; type: ExerciseType }>;
}

export const CreateWorkoutScreen: React.FC<CreateWorkoutScreenProps> = ({
  navigation,
  route,
}) => {
  const { exercises, createWorkout, updateWorkout, workouts } = useWorkout();
  const [workoutName, setWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<ExerciseType | 'ALL'>('ALL');
  const [isCreating, setIsCreating] = useState(false);

  // Determine if we're editing an existing workout
  const workoutId = (route.params as any)?.workoutId;
  const isEditing = Boolean(workoutId);
  const existingWorkout = isEditing ? workouts.find((w) => w.id === workoutId) : null;

  // Initialize with existing workout data if editing
  React.useEffect(() => {
    if (isEditing && existingWorkout) {
      setWorkoutName(existingWorkout.name);
      setSelectedExercises(existingWorkout.exerciseIds);
    }
  }, [isEditing, existingWorkout]);

  const filteredExercises =
    filterType === 'ALL'
      ? exercises
      : exercises.filter((e) => e.type === filterType);

  // Group exercises by goal
  const groupedExercises: GroupedExercise[] = Object.entries(TRAINING_GOAL_META)
    .map(([goal]) => ({
      title: TRAINING_GOAL_META[goal as TrainingGoal].displayName,
      data: filteredExercises
        .filter((e) => e.goal === goal)
        .map((e) => ({
          id: e.id,
          name: e.name,
          goal: e.goal,
          type: e.type,
        })),
    }))
    .filter((group) => group.data.length > 0);

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  };

  const handleCreateWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert('Błąd', 'Podaj nazwę zestawu');
      return;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Błąd', 'Dodaj co najmniej jedno ćwiczenie');
      return;
    }

    setIsCreating(true);
    try {
      if (isEditing && workoutId) {
        await updateWorkout(workoutId, workoutName.trim(), selectedExercises);
        Alert.alert('Sukces', 'Zestaw treningowy został zaktualizowany', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        await createWorkout(workoutName.trim(), selectedExercises);
        Alert.alert('Sukces', 'Zestaw treningowy został utworzony', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert('Błąd', `Nie udało się ${isEditing ? 'zaktualizować' : 'utworzyć'} zestawu`);
    } finally {
      setIsCreating(false);
    }
  };

  if (exercises.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{isEditing ? 'Edytuj Zestaw' : 'Nowy Zestaw'}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="barbell" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Brak Ćwiczeń</Text>
          <Text style={styles.emptyMessage}>
            Dodaj ćwiczenia aby móc stworzyć zestaw treningowy
          </Text>
          <Pressable
            onPress={() => navigation.navigate('ExerciseListMain')}
            style={styles.emptyButton}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.emptyButtonText}>Dodaj Ćwiczenie</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? 'Edytuj Zestaw' : 'Nowy Zestaw'}</Text>
        <Pressable
          disabled={!workoutName.trim() || selectedExercises.length === 0 || isCreating}
          onPress={handleCreateWorkout}
        >
          <Text
            style={[
              styles.headerButton,
              (!workoutName.trim() || selectedExercises.length === 0 || isCreating) &&
                styles.headerButtonDisabled,
            ]}
          >
            Gotowe
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Workout Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nazwa Zestawu</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="np. Trening nóg"
            value={workoutName}
            onChangeText={setWorkoutName}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Filter Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filtr Ćwiczeń</Text>
          <SegmentedControl
            tabs={['Wszystkie', 'Wielostawowe', 'Izolowane']}
            selectedIndex={filterType === 'ALL' ? 0 : filterType === 'COMPOUND' ? 1 : 2}
            onChange={(index) => {
              const types: Array<ExerciseType | 'ALL'> = ['ALL', 'COMPOUND', 'ISOLATION'];
              setFilterType(types[index]);
            }}
          />
        </View>

        {/* Selected Count */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Wybrane Ćwiczenia ({selectedExercises.length})
          </Text>
        </View>

        {/* Exercises List */}
        {groupedExercises.length > 0 ? (
          groupedExercises.map((group) => (
            <View key={group.title} style={styles.exerciseGroup}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.data.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  style={[
                    styles.exerciseItem,
                    selectedExercises.includes(exercise.id) &&
                      styles.exerciseItemSelected,
                  ]}
                  onPress={() => toggleExercise(exercise.id)}
                >
                  <View style={styles.exerciseContent}>
                    <View style={styles.exerciseMain}>
                      <Text
                        style={[
                          styles.exerciseName,
                          selectedExercises.includes(exercise.id) &&
                            styles.exerciseNameSelected,
                        ]}
                      >
                        {exercise.name}
                      </Text>
                      <Text
                        style={[
                          styles.exerciseType,
                          selectedExercises.includes(exercise.id) &&
                            styles.exerciseTypeSelected,
                        ]}
                      >
                        {EXERCISE_TYPE_META[exercise.type].displayName}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        selectedExercises.includes(exercise.id) &&
                          styles.checkboxSelected,
                      ]}
                    >
                      {selectedExercises.includes(exercise.id) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>Brak ćwiczeń spełniających kryteria</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Button at Bottom */}
      <View style={styles.bottomButton}>
        <Pressable
          style={[
            styles.createButton,
            (!workoutName.trim() || selectedExercises.length === 0) &&
              styles.createButtonDisabled,
          ]}
          onPress={handleCreateWorkout}
          disabled={!workoutName.trim() || selectedExercises.length === 0 || isCreating}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="white" />
          <Text style={styles.createButtonText}>
            {isCreating ? 'Tworzenie...' : 'Utwórz Zestaw'}
          </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerButton: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  headerButtonDisabled: {
    color: colors.textSecondary,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  nameInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  exerciseGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  exerciseItem: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  exerciseContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseMain: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseNameSelected: {
    color: 'white',
  },
  exerciseType: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  exerciseTypeSelected: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  noResults: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bottomButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 8,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.textSecondary,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
