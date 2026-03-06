import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useAuth } from '../store/AuthContext';
import { WorkoutSession, CommunityPost } from '../types/models';
import { ModernCard } from '../components/Cards';
import { repository } from '../services/repository';
import { SegmentedControl } from '../components/SegmentedControl';
import { CommunityStackParamList } from '../types/navigation';

type FriendWorkout = WorkoutSession & {
  friendId: string;
  friendNickname?: string;
  friendPhotoURL?: string;
};

type CommunitySection = 'NEWS' | 'RANKINGS';

type RankingExercise = {
  key: string;
  exerciseName: string;
  bestWeight: number;
  sessionsCount: number;
  latestDate: any;
};

type Props = NativeStackScreenProps<CommunityStackParamList, 'CommunityMain'>;

// Simple date formatter
const getTimeAgo = (timestamp: any): string => {
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'właśnie teraz';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m temu`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h temu`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d temu`;
    
    return date.toLocaleDateString('pl-PL');
  } catch (error) {
    return 'niedawno';
  }
};

export const CommunityScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [section, setSection] = useState<CommunitySection>('NEWS');
  const [friendsWorkouts, setFriendsWorkouts] = useState<FriendWorkout[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [mySessions, setMySessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  const loadCommunityData = async () => {
    if (!user) return;

    try {
      // Fetch user's friends
      const friends = await repository.getFriends(user.uid);
      const friendIds = [user.uid, ...friends.map(f => f.userId)]; // Include own ID to see own posts
      setFriendIds(friendIds);

      // Fetch community posts from friends and self
      const posts = await repository.fetchCommunityPosts(friendIds, 50);
      setCommunityPosts(posts);

      // Fetch user's own sessions for rankings
      const ownSessions = await repository.fetchRecentWorkoutSessions(user.uid, 200);
      setMySessions(ownSessions);
    } catch (error) {
      console.error('Error loading community data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCommunityData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCommunityData();
  };

  const getInitials = (nickname?: string) => {
    if (!nickname) return '?';
    return nickname
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSessionBestWeight = (session: WorkoutSession) => {
    const setWeights = (session.sets || []).map((set: any) => Number(set.weight || 0));
    const maxSetWeight = setWeights.length > 0 ? Math.max(...setWeights) : 0;
    return Math.max(Number(session.weight || 0), maxSetWeight);
  };

  const normalizeExerciseName = (name?: string) => (name || '').trim().toLowerCase();

  const rankingExercises = useMemo<RankingExercise[]>(() => {
    const grouped = new Map<string, RankingExercise>();

    mySessions.forEach((session) => {
      const key = normalizeExerciseName(session.exerciseName);
      if (!key) return;

      const current = grouped.get(key);
      const sessionBestWeight = getSessionBestWeight(session);

      if (!current) {
        grouped.set(key, {
          key,
          exerciseName: session.exerciseName,
          bestWeight: sessionBestWeight,
          sessionsCount: 1,
          latestDate: session.date,
        });
        return;
      }

      grouped.set(key, {
        ...current,
        bestWeight: Math.max(current.bestWeight, sessionBestWeight),
        sessionsCount: current.sessionsCount + 1,
        latestDate: session.date.toMillis() > current.latestDate.toMillis() ? session.date : current.latestDate,
      });
    });

    return [...grouped.values()].sort((a, b) => b.latestDate.toMillis() - a.latestDate.toMillis());
  }, [mySessions]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Społeczność</Text>
        </View>
        <SegmentedControl
          tabs={['Aktualności', 'Rankingi']}
          selectedIndex={section === 'NEWS' ? 0 : 1}
          onChange={(index) => setSection(index === 0 ? 'NEWS' : 'RANKINGS')}
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Show private account message
  if (userProfile?.isPrivate) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Społeczność</Text>
        </View>
        <SegmentedControl
          tabs={['Aktualności', 'Rankingi']}
          selectedIndex={section === 'NEWS' ? 0 : 1}
          onChange={(index) => setSection(index === 0 ? 'NEWS' : 'RANKINGS')}
        />
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="lock" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Konto prywatne</Text>
          <Text style={styles.emptyMessage}>Twoje konto jest prywatne. Zmień ustawienia, aby pokazywać się w społeczności.</Text>
          <Pressable
            style={styles.privateAccountButton}
            onPress={() => navigation.navigate('UserPanel' as any)}
          >
            <Text style={styles.privateAccountButtonText}>Przejdź do Konta</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (section === 'NEWS' && communityPosts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Społeczność</Text>
        </View>
        <SegmentedControl
          tabs={['Aktualności', 'Rankingi']}
          selectedIndex={section === 'NEWS' ? 0 : 1}
          onChange={(index) => setSection(index === 0 ? 'NEWS' : 'RANKINGS')}
        />
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Brak aktywności przyjaciół</Text>
          <Text style={styles.emptyMessage}>Dodaj przyjaciół aby widzieć ich treningi</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Społeczność</Text>
      </View>
      <SegmentedControl
        tabs={['Aktualności', 'Rankingi']}
        selectedIndex={section === 'NEWS' ? 0 : 1}
        onChange={(index) => setSection(index === 0 ? 'NEWS' : 'RANKINGS')}
      />

      {section === 'NEWS' ? (
        <>
          {refreshing && communityPosts.length === 0 && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          {!refreshing || communityPosts.length > 0 ? (
            <FlatList
              data={communityPosts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <CommunityPostCard post={item} />}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              scrollEnabled={true}
              nestedScrollEnabled={true}
            />
          ) : null}
        </>
      ) : rankingExercises.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="barbell" size={60} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Brak ćwiczeń do rankingu</Text>
          <Text style={styles.emptyMessage}>Zapisz trening, aby zobaczyć rankingi dla swoich ćwiczeń</Text>
        </View>
      ) : (
        <>
          {refreshing && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          {!refreshing ? (
            <FlatList
              data={rankingExercises}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => {
                return (
                  <Pressable
                    style={styles.rankingExerciseRow}
                    onPress={() =>
                      navigation.navigate('CommunityLeaderboard', {
                        exerciseKey: item.key,
                        exerciseName: item.exerciseName,
                      })
                    }
                  >
                    <View style={styles.rankingExerciseInfo}>
                      <Text style={styles.rankingExerciseName}>{item.exerciseName}</Text>
                      <Text style={styles.rankingExerciseMeta}>{item.sessionsCount} sesji</Text>
                    </View>
                    <View style={styles.rankingExerciseRight}>
                      <Text style={styles.rankingExerciseWeight}>{item.bestWeight.toFixed(1)} kg</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </View>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListHeaderComponent={<Text style={styles.rankingListTitle}>Twoje ćwiczenia</Text>}
            />
          ) : null}
        </>
      )}
    </View>
  );
};

const CommunityPostCard: React.FC<{
  post: CommunityPost;
}> = ({ post }) => {
  const { user } = useAuth();
  const [impressions, setImpressions] = useState<Record<string, 'heart' | 'bicep' | 'celebration'>>(post.impressions || {});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  // Update impressions when post changes
  useEffect(() => {
    setImpressions(post.impressions || {});
  }, [post.impressions]);

  const getInitials = (nickname?: string) => {
    if (!nickname) return '?';
    return nickname
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddImpression = async (impression: 'heart' | 'bicep' | 'celebration') => {
    if (!user?.uid || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const currentImpression = impressions[user.uid];
      
      // If clicking the same impression, remove it
      if (currentImpression === impression) {
        await repository.removeImpression(post.id, user.uid);
        const updated = { ...impressions };
        delete updated[user.uid];
        setImpressions(updated);
      } else {
        // Add or update the impression
        await repository.addImpression(post.id, user.uid, impression);
        setImpressions({ ...impressions, [user.uid]: impression });
      }
    } catch (error) {
      console.error('Error updating impression:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getImpressionStats = () => {
    const stats = { heart: 0, bicep: 0, celebration: 0 };
    Object.values(impressions).forEach((imp) => {
      stats[imp as keyof typeof stats]++;
    });
    return stats;
  };

  const stats = getImpressionStats();
  const userImpression = user?.uid ? impressions[user.uid] : undefined;

  return (
    <Pressable>
      <ModernCard>
        <View style={styles.postCardContainer}>
          {/* User Header */}
          <View style={styles.postHeader}>
            <View style={styles.postUserProfile}>
              {post.photoURL ? (
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: post.photoURL }} 
                    style={styles.postUserAvatar}
                    onLoadStart={() => setIsPhotoLoading(true)}
                    onLoadEnd={() => setIsPhotoLoading(false)}
                  />
                  {isPhotoLoading && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.postUserAvatar, styles.postUserAvatarPlaceholder]}>
                  <Text style={styles.postUserAvatarInitials}>{getInitials(post.nickname)}</Text>
                </View>
              )}
              <View style={styles.postUserInfo}>
                <Text style={styles.postUserName}>{post.nickname}</Text>
                <Text style={styles.postTimeAgo}>{getTimeAgo(post.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Post Message */}
          <View style={styles.postMessageContainer}>
            <Text style={styles.postMessage}>{post.message}</Text>
          </View>

          {/* Post Stats */}
          <View style={styles.postStatsContainer}>
            <View style={styles.postStat}>
              <Ionicons name="barbell" size={16} color={colors.primary} />
              <Text style={styles.postStatText}>{post.exerciseName}</Text>
            </View>
            <View style={styles.postStat}>
              <Ionicons name="flash" size={16} color={colors.primary} />
              <Text style={styles.postStatText}>{post.weight.toFixed(1)} kg</Text>
            </View>
          </View>

          {/* Impression Buttons */}
          <View style={styles.impressionContainer}>
            <Pressable
              style={[
                styles.impressionButton,
                userImpression === 'heart' && styles.impressionButtonActive,
              ]}
              onPress={() => handleAddImpression('heart')}
              disabled={isUpdating}
            >
              {isUpdating && userImpression === 'heart' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name={userImpression === 'heart' ? 'heart' : 'heart-outline'}
                    size={18}
                    color={userImpression === 'heart' ? '#e74c3c' : colors.textSecondary}
                  />
                  {stats.heart > 0 && <Text style={styles.impressionCount}>{stats.heart}</Text>}
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.impressionButton,
                userImpression === 'bicep' && styles.impressionButtonActive,
              ]}
              onPress={() => handleAddImpression('bicep')}
              disabled={isUpdating}
            >
              {isUpdating && userImpression === 'bicep' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name={userImpression === 'bicep' ? 'flame' : 'flame-outline'}
                    size={18}
                    color={userImpression === 'bicep' ? '#ff6b35' : colors.textSecondary}
                  />
                  {stats.bicep > 0 && <Text style={styles.impressionCount}>{stats.bicep}</Text>}
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.impressionButton,
                userImpression === 'celebration' && styles.impressionButtonActive,
              ]}
              onPress={() => handleAddImpression('celebration')}
              disabled={isUpdating}
            >
              {isUpdating && userImpression === 'celebration' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons
                    name={userImpression === 'celebration' ? 'sparkles' : 'sparkles-outline'}
                    size={18}
                    color={userImpression === 'celebration' ? '#f39c12' : colors.textSecondary}
                  />
                  {stats.celebration > 0 && <Text style={styles.impressionCount}>{stats.celebration}</Text>}
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ModernCard>
    </Pressable>
  );
};

const WorkoutFeedCard: React.FC<{
  workout: FriendWorkout;
  getInitials: (nickname?: string) => string;
}> = ({ workout, getInitials }) => {
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  const getTotalReps = () => {
    if (!workout.sets || workout.sets.length === 0) return 0;
    return workout.sets.reduce((sum, set: any) => sum + (set.reps || 0), 0);
  };

  return (
    <Pressable>
      <ModernCard>
        <View style={styles.feedCardContainer}>
          {/* Friend Header */}
          <View style={styles.friendHeader}>
            <View style={styles.friendProfile}>
              {workout.friendPhotoURL ? (
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: workout.friendPhotoURL }} 
                    style={styles.friendAvatar}
                    onLoadStart={() => setIsPhotoLoading(true)}
                    onLoadEnd={() => setIsPhotoLoading(false)}
                  />
                  {isPhotoLoading && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]}>
                  <Text style={styles.friendAvatarInitials}>{getInitials(workout.friendNickname)}</Text>
                </View>
              )}
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{workout.friendNickname || 'Przyjaciel'}</Text>
                <Text style={styles.timeAgo}>{getTimeAgo(workout.date)}</Text>
              </View>
            </View>
          </View>

          {/* Exercise Info */}
          <View style={styles.exerciseSection}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{workout.exerciseName}</Text>
              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>
                  {workout.goal === 'HYPERTROPHY'
                    ? 'Hipertrofia'
                    : workout.goal === 'MAX_STRENGTH'
                    ? 'Siła'
                    : 'Wytrzymałość'}
                </Text>
              </View>
            </View>

            {/* Workout Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="barbell" size={16} color={colors.primary} />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Waga</Text>
                  <Text style={styles.statValue}>{workout.weight.toFixed(1)} kg</Text>
                </View>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="repeat" size={16} color={colors.primary} />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Serie</Text>
                  <Text style={styles.statValue}>{(workout.sets || []).length}x</Text>
                </View>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Razem</Text>
                  <Text style={styles.statValue}>{getTotalReps()} powt.</Text>
                </View>
              </View>
            </View>

            {/* Set Details */}
            {(workout.sets || []).length > 0 && (
              <View style={styles.setsContainer}>
                <Text style={styles.setsTitle}>Serie:</Text>
                <View style={styles.setsList}>
                  {(workout.sets || []).map((set: any, index: number) => (
                    <View key={index} style={styles.setItem}>
                      <Text style={styles.setNumber}>#{index + 1}</Text>
                      <Text style={styles.setValue}>
                        {set.reps}x {set.weight}kg
                      </Text>
                      {set.rir !== null && set.rir !== undefined && (
                        <Text style={styles.rirValue}>RIR: {set.rir}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Notes */}
            {workout.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notatki:</Text>
                <Text style={styles.notesText}>{workout.notes}</Text>
              </View>
            )}
          </View>
        </View>
      </ModernCard>
    </Pressable>
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
  centerContent: {
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
    textAlign: 'center',
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  feedCardContainer: {
    gap: 12,
  },
  friendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  friendAvatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  exerciseSection: {
    gap: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  goalBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  goalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  setsContainer: {
    gap: 8,
  },
  setsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
  },
  setsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  setItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.chip,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  setNumber: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  setValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  rirValue: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  notesContainer: {
    backgroundColor: colors.chip,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  rankingListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  rankingExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  rankingExerciseInfo: {
    flex: 1,
    paddingRight: 12,
  },
  rankingExerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rankingExerciseMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rankingExerciseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rankingExerciseWeight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  privateAccountButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  privateAccountButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  postCardContainer: {
    gap: 12,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postUserProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  postUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  postUserAvatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postUserAvatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  postTimeAgo: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  postMessageContainer: {
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  postMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  postStatsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  postStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.chip,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  impressionContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  impressionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.chip,
  },
  impressionButtonActive: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  impressionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
