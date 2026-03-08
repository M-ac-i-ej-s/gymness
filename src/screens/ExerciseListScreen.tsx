import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout, getGoalRangeText, getExerciseIncrementText } from '../store/WorkoutContext';
import { Exercise, ExerciseType, TrainingGoal, EXERCISE_TYPE_META, TRAINING_GOAL_META } from '../types/models';
import { ModernCard } from '../components/Cards';
import { useAddExerciseDialog } from '../navigation/RootNavigator';

interface ExerciseListScreenProps {
  onSelectExercise: (id: string) => void;
  onStartWorkout: (id: string) => void;
}

export const ExerciseListScreen: React.FC<ExerciseListScreenProps> = ({ onSelectExercise, onStartWorkout }) => {
  const { exercises, createExercise } = useWorkout();
  const { showAddDialog, setShowAddDialog } = useAddExerciseDialog();
  const EXERCISES_PAGE_SIZE = 20;

  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('COMPOUND');
  const [goal, setGoal] = useState<TrainingGoal>('HYPERTROPHY');
  const [sets, setSets] = useState('3');
  const [weight, setWeight] = useState('0');
  const [visibleCount, setVisibleCount] = useState(EXERCISES_PAGE_SIZE);

  const POPULAR_EXERCISES: Array<{ name: string; type: ExerciseType }> = [
    { name: 'Przysiad ze sztangą', type: 'COMPOUND' },
    { name: 'Martwy ciąg', type: 'COMPOUND' },
    { name: 'Wyciskanie sztangi leżąc', type: 'COMPOUND' },
    { name: 'Wyciskanie żołnierskie', type: 'COMPOUND' },
    { name: 'Podciąganie na drążku', type: 'COMPOUND' },
    { name: 'Wiosłowanie sztangą', type: 'COMPOUND' },
    { name: 'Wykroki z hantlami', type: 'COMPOUND' },
    { name: 'Wyciskanie hantli na skosie', type: 'COMPOUND' },
    { name: 'Hip thrust', type: 'COMPOUND' },
    { name: 'Pompki na poręczach', type: 'COMPOUND' },
    { name: 'Uginanie ramion z hantlami', type: 'ISOLATION' },
    { name: 'Prostowanie ramion na wyciągu', type: 'ISOLATION' },
    { name: 'Unoszenie bokiem hantli', type: 'ISOLATION' },
    { name: 'Rozpiętki na ławce', type: 'ISOLATION' },
    { name: 'Prostowanie nóg na maszynie', type: 'ISOLATION' },
    { name: 'Uginanie nóg leżąc', type: 'ISOLATION' },
    { name: 'Wspięcia na palce stojąc', type: 'ISOLATION' },
    { name: 'Face pull', type: 'ISOLATION' },
    { name: 'Odwodzenie nóg na maszynie', type: 'ISOLATION' },
    { name: 'Przywodzenie nóg na maszynie', type: 'ISOLATION' },
  ];

  const selectedPopularExercise = POPULAR_EXERCISES.find((exercise) => exercise.name === name.trim());
  const isTypeLocked = Boolean(selectedPopularExercise);
  const visibleExercises = exercises.slice(0, visibleCount);
  const hasMoreExercises = visibleCount < exercises.length;

  useEffect(() => {
    setVisibleCount(EXERCISES_PAGE_SIZE);
  }, [exercises.length]);

  const loadMoreExercises = () => {
    if (!hasMoreExercises) {
      return;
    }

    setVisibleCount((prev) => Math.min(prev + EXERCISES_PAGE_SIZE, exercises.length));
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    // Reset form
    setName('');
    setType('COMPOUND');
    setGoal('HYPERTROPHY');
    setSets('3');
    setWeight('0');
  };

  const handlePopularExerciseSelect = (exercise: { name: string; type: ExerciseType }) => {
    setName(exercise.name);
    setType(exercise.type);
  };

  const handleAddExercise = async () => {
    if (name.trim()) {
      await createExercise({
        name: name.trim(),
        type,
        goal,
        targetSets: parseInt(sets, 10) || 3,
        startingWeight: parseFloat(weight) || 0,
      });
      closeDialog();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Moja Siłownia</Text>
        </View>
      </View>
      {exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="barbell" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Zacznij Trenować</Text>
          <Text style={styles.emptyMessage}>Twoja lista ćwiczeń jest pusta</Text>
          <Pressable
            onPress={() => setShowAddDialog(true)}
            style={styles.emptyButton}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.emptyButtonText}>Dodaj Pierwsze Ćwiczenie</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleExercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ExerciseItem
              exercise={item}
              onPress={() => onSelectExercise(item.id)}
              onStartWorkout={() => onStartWorkout(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreExercises}
          onEndReachedThreshold={0.3}
          scrollEnabled
          nestedScrollEnabled
        />
      )}

      <Modal visible={showAddDialog} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalBackground} onPress={closeDialog} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable onPress={closeDialog}>
                <Text style={styles.modalCloseButton}>Anuluj</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Nowe Ćwiczenie</Text>
              <Pressable onPress={handleAddExercise} disabled={!name.trim()}>
                <Text style={[styles.modalCloseButton, !name.trim() && styles.modalCloseButtonDisabled]}>
                  Zapisz
                </Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nazwa ćwiczenia</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="np. Przysiad"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.formHint}>
                  Wybierz z listy lub wpisz własną nazwę.
                </Text>
                <View style={styles.popularExercisesContainer}>
                  {POPULAR_EXERCISES.map((exercise) => {
                    const isSelected = selectedPopularExercise?.name === exercise.name;
                    return (
                      <Pressable
                        key={exercise.name}
                        onPress={() => handlePopularExerciseSelect(exercise)}
                        style={[
                          styles.popularExerciseChip,
                          isSelected && styles.popularExerciseChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.popularExerciseChipText,
                            isSelected && styles.popularExerciseChipTextSelected,
                          ]}
                        >
                          {exercise.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Typ ćwiczenia</Text>
                {isTypeLocked && (
                  <Text style={styles.formHint}>
                    Typ zablokowany dla ćwiczenia wybranego z listy: {EXERCISE_TYPE_META[type].displayName}
                  </Text>
                )}
                <View style={styles.dropdownContainer}>
                  {(['COMPOUND', 'ISOLATION'] as const).map((typeValue) => (
                    <Pressable
                      key={typeValue}
                      onPress={() => {
                        if (!isTypeLocked) {
                          setType(typeValue);
                        }
                      }}
                      disabled={isTypeLocked}
                      style={[
                        styles.dropdownItem,
                        type === typeValue && styles.dropdownItemSelected,
                        isTypeLocked && styles.dropdownItemDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          type === typeValue && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {EXERCISE_TYPE_META[typeValue].displayName}
                      </Text>
                      <Text
                        style={[
                          styles.dropdownItemExamples,
                          type === typeValue && styles.dropdownItemExamplesSelected,
                        ]}
                      >
                        {typeValue === 'COMPOUND'
                          ? 'np. Przysiad, Wyciskanie, Martwy Ciąg'
                          : 'np. Uginanie ramion, Rozciąganie nóg, Lateralne podniesienia'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cel treningowy</Text>
                <View style={styles.dropdownContainer}>
                  {(['HYPERTROPHY', 'MAX_STRENGTH', 'ENDURANCE'] as const).map((goalValue) => (
                    <Pressable
                      key={goalValue}
                      onPress={() => setGoal(goalValue)}
                      style={[
                        styles.dropdownItem,
                        goal === goalValue && styles.dropdownItemSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          goal === goalValue && styles.dropdownItemTextSelected,
                        ]}
                      >
                        {TRAINING_GOAL_META[goalValue].description}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Liczba serii</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="3"
                    value={sets}
                    onChangeText={(text) => setSets(text.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.formLabel}>Początkowy ciężar (kg)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.helperText}>
                <Text style={styles.helperTextLabel}>Zakres: {getGoalRangeText(goal)} powtórzeń</Text>
                <Text style={styles.helperTextLabel}>Sugerowany wzrost: {getExerciseIncrementText(type)}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const ExerciseItem: React.FC<{
  exercise: Exercise;
  onPress: () => void;
  onStartWorkout: () => void;
}> = ({ exercise, onPress, onStartWorkout }) => (
  <Pressable onPress={onPress}>
    <ModernCard>
      <View style={styles.exerciseItemRow}>
        <View style={styles.exerciseItemContent}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseSubtitle}>
            {EXERCISE_TYPE_META[exercise.type].displayName} • {exercise.targetSets} serie
          </Text>
        </View>
        <View style={styles.exerciseWeightBadge}>
          <Text style={styles.exerciseWeight}>{exercise.currentWeight.toFixed(1)} kg</Text>
        </View>
      </View>

      <View style={styles.exerciseInfoRow}>
        <View style={styles.exerciseBadge}>
          <Text style={styles.exerciseBadgeText}>
            {exercise.goal === 'HYPERTROPHY'
              ? '6-12 powt.'
              : exercise.goal === 'MAX_STRENGTH'
              ? '3-6 powt.'
              : '12-20+ powt.'}
          </Text>
        </View>
        <Pressable
          onPress={onStartWorkout}
          style={styles.exerciseStartButton}
        >
          <Ionicons name="play" size={16} color="white" />
          <Text style={styles.exerciseStartButtonText}>Trening</Text>
        </Pressable>
      </View>
    </ModernCard>
  </Pressable>
);

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  fabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  exerciseItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseItemContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  exerciseWeightBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exerciseWeight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  exerciseInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseBadge: {
    backgroundColor: colors.chip,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exerciseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  exerciseStartButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseStartButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalCloseButton: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modalCloseButtonDisabled: {
    color: colors.textSecondary,
    opacity: 0.5,
  },
  modalFormContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  formInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: colors.cardSecondary,
    color: colors.text,
  },
  formHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  popularExercisesContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularExerciseChip: {
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.cardSecondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  popularExerciseChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  popularExerciseChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  popularExerciseChipTextSelected: {
    color: 'white',
  },
  dropdownContainer: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.cardSecondary,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primary,
  },
  dropdownItemDisabled: {
    opacity: 0.65,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  dropdownItemExamples: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '400',
  },
  dropdownItemExamplesSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  helperText: {
    backgroundColor: colors.chip,
    padding: 12,
    borderRadius: 10,
  },
  helperTextLabel: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
    fontWeight: '500',
  },
});
