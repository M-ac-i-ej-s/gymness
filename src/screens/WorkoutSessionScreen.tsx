import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useWorkout, createWorkoutSet } from '../store/WorkoutContext';
import { useAuth } from '../store/AuthContext';
import { TRAINING_GOAL_META, WorkoutSet } from '../types/models';
import { formatKg } from '../utils/format';
import { repository } from '../services/repository';

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const generateProgressMessage = (weight: number, exerciseName: string): string => {
  const formattedWeight = weight.toFixed(1);
  const messages = [
    `Juhu! Podnoszę już ${formattedWeight} kg podczas ${exerciseName} 🎉!`,
    `Nareszcie! To juz ${formattedWeight} kg jak wykonuje ${exerciseName}🥳!`,
    `Udało sie! Progres do ${formattedWeight} kg na ${exerciseName} zrobiony 🙌🏻!`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

export const WorkoutSessionScreen: React.FC<{
  exerciseId: string;
  workoutId?: string;
  onComplete: (completedExerciseId?: string) => void;
}> = ({ exerciseId, workoutId, onComplete }) => {
  const { getExerciseById, createWorkoutSession, fetchRecentSessions, workouts, completeExerciseInTraining, activeTraining } = useWorkout();
  const { user, userProfile } = useAuth();
  const exercise = getExerciseById(exerciseId);
  const workout = workoutId ? workouts.find((w) => w.id === workoutId) : undefined;

  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [currentReps, setCurrentReps] = useState('');
  const [currentRir, setCurrentRir] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const repsInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!exercise) return null;

  const addSet = (repsValue?: string) => {
    const repsText = repsValue ?? currentReps;
    const reps = parseInt(repsText, 10);
    if (!Number.isNaN(reps) && reps > 0) {
      setSets((prevSets) => {
        const set = createWorkoutSet(prevSets.length + 1, reps, exercise.currentWeight, currentRir);
        return [...prevSets, set];
      });
      setCurrentReps('');
      setCurrentRir(null);
      setTimeout(() => {
        repsInputRef.current?.focus();
      }, 0);
    }
  };

  const handleCurrentRepsChange = (text: string) => {
    const sanitized = text.replace(/[^0-9]/g, '');

    if (!sanitized) {
      setCurrentReps('');
      return;
    }

    addSet(sanitized);
  };

  const removeSet = (setId: string) => {
    setSets((prevSets) =>
      prevSets
        .filter((set) => set.id !== setId)
        .map((set, index) => ({
          ...set,
          setNumber: index + 1,
        })),
    );
  };

  const updateSetReps = (setId: string, repsText: string) => {
    const sanitized = repsText.replace(/[^0-9]/g, '');

    setSets((prevSets) =>
      prevSets.map((set) => {
        if (set.id !== setId) return set;
        if (!sanitized) return set;

        const reps = parseInt(sanitized, 10);
        if (Number.isNaN(reps) || reps <= 0) return set;

        return {
          ...set,
          reps,
        };
      }),
    );
  };

  const updateSetRir = (setId: string, rir: number) => {
    setSets((prevSets) =>
      prevSets.map((set) => {
        if (set.id !== setId) return set;

        return {
          ...set,
          rir: set.rir === rir ? null : rir,
        };
      }),
    );
  };

  const handleSave = async () => {
    if (sets.length > 0) {
      setShowDialog(false);
      await createWorkoutSession(exercise, sets, undefined, workoutId, workout?.name);
      
      // Create community post if user is not private
      if (!userProfile?.isPrivate && userProfile?.nickname && user) {
        try {
          // Create post immediately with current session weight
          const sessionWeight = exercise.currentWeight;
          const message = generateProgressMessage(sessionWeight, exercise.name);
          
          await repository.createCommunityPost(user.uid, {
            userId: user.uid,
            nickname: userProfile.nickname,
            photoURL: userProfile.photoURL,
            postType: 'weight_increase',
            exerciseName: exercise.name,
            weight: sessionWeight,
            message,
          });
        } catch (error) {
          console.error('Error creating community post:', error);
        }
      }
      
      await fetchRecentSessions();
      
      if (activeTraining) {
        completeExerciseInTraining(exerciseId);
        onComplete(exerciseId);
      } else {
        onComplete(exerciseId);
      }
    }
  };

  const goalMeta = TRAINING_GOAL_META[exercise.goal];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => onComplete()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{exercise.name}</Text>
          <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.weightDisplay}>{formatKg(exercise.currentWeight)}</Text>
          <Text style={styles.goalText}>
            Cel: {goalMeta.minReps}-{goalMeta.maxReps} powtórzeń × {exercise.targetSets} serie
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.inputSection}>
          {sets.map((set) => (
            <View key={set.id} style={styles.setItem}>
              <View style={styles.setRowContent}>
                <Text style={styles.setLabel}>Seria {set.setNumber}</Text>
                <Text style={styles.label}>Powtórzenia</Text>
                <TextInput
                  style={styles.setRepsInput}
                  value={String(set.reps)}
                  onChangeText={(text) => updateSetReps(set.id, text)}
                  keyboardType="number-pad"
                />
                <Text style={styles.label}>Powtórzenia w zapasie (RIR)</Text>
                <View style={styles.setRirOptions}>
                  {[0, 1, 2, 3, 4, 5].map((rir) => (
                    <Pressable
                      key={`${set.id}-${rir}`}
                      onPress={() => updateSetRir(set.id, rir)}
                      style={[
                        styles.rirChip,
                        set.rir === rir && styles.rirChipSelected,
                      ]}
                    >
                      <Text style={[styles.rirChipText, set.rir === rir && styles.rirChipTextSelected]}>
                        {rir}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {set.rir !== null && <Text style={styles.rirLabel}>W zapasie: {set.rir}</Text>}
              </View>
              <Pressable onPress={() => removeSet(set.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Seria {sets.length + 1}</Text>

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Powtórzenia</Text>
              <TextInput
                ref={repsInputRef}
                style={styles.input}
                placeholder="Liczba"
                value={currentReps}
                onChangeText={handleCurrentRepsChange}
                keyboardType="number-pad"
                autoFocus
              />
            </View>
          </View>

          <View style={styles.rirSection}>
            <Text style={styles.label}>RIR (opcjonalne)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rirOptions}>
              {[0, 1, 2, 3, 4, 5].map((rir) => (
                <Pressable
                  key={rir}
                  onPress={() => setCurrentRir(currentRir === rir ? null : rir)}
                  style={[
                    styles.rirChip,
                    currentRir === rir && styles.rirChipSelected,
                  ]}
                >
                  <Text style={[styles.rirChipText, currentRir === rir && styles.rirChipTextSelected]}>
                    {rir}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {sets.length >= exercise.targetSets && (
            <Pressable onPress={() => setShowDialog(true)} style={[styles.button, styles.buttonPrimary]}>
              <Ionicons name="checkmark-done" size={20} color="white" />
              <Text style={styles.buttonTextPrimary}>Zakończ ćwiczenie</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Modal visible={showDialog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Zakończ ćwiczenie</Text>
            <Text style={styles.modalMessage}>Czy chcesz zapisać {sets.length} serii?</Text>

            <View style={styles.modalButtonRow}>
              <Pressable
                onPress={() => setShowDialog(false)}
                style={[styles.modalButton, styles.modalButtonSecondary]}
              >
                <Text style={styles.modalButtonTextSecondary}>Anuluj</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[styles.modalButton, styles.modalButtonPrimary]}>
                <Text style={styles.modalButtonTextPrimary}>Zapisz</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  exerciseInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  weightDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  goalText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  setItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  setRowContent: {
    flex: 1,
    marginRight: 12,
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  rirLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  setRepsInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: colors.bg,
    color: colors.text,
    marginBottom: 8,
  },
  setRirOptions: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 6,
  },
  deleteButton: {
    padding: 4,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: colors.card,
    color: colors.text,
  },
  rirSection: {
    marginBottom: 20,
  },
  rirOptions: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  rirChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.chip,
    marginHorizontal: 4,
  },
  rirChipSelected: {
    backgroundColor: colors.primary,
  },
  rirChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  rirChipTextSelected: {
    color: 'white',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    flexDirection: 'row',
    gap: 8,
  },
  buttonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonSecondary: {
    backgroundColor: colors.chip,
  },
  modalButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  modalButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
