import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WorkoutSession } from '../types/models';
import { CommunityStackParamList } from '../types/navigation';
import { useAuth } from '../store/AuthContext';
import { repository } from '../services/repository';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<CommunityStackParamList, 'CommunityLeaderboard'>;

type FriendWorkout = WorkoutSession & {
  friendId: string;
  friendNickname?: string;
  friendPhotoURL?: string;
};

type LeaderboardEntry = {
  userId: string;
  nickname: string;
  photoURL?: string;
  bestWeight: number;
  latestDate: any;
  sessionsCount: number;
};

const normalizeExerciseName = (name?: string) => (name || '').trim().toLowerCase();

const getSessionBestWeight = (session: WorkoutSession) => {
  const setWeights = (session.sets || []).map((set: any) => Number(set.weight || 0));
  const maxSetWeight = setWeights.length > 0 ? Math.max(...setWeights) : 0;
  return Math.max(Number(session.weight || 0), maxSetWeight);
};

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

export const CommunityLeaderboardScreen: React.FC<Props> = ({ route, navigation }) => {
  const { exerciseKey, exerciseName } = route.params;
  const { user, userProfile } = useAuth();

  const [friendsWorkouts, setFriendsWorkouts] = useState<FriendWorkout[]>([]);
  const [mySessions, setMySessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAvatars, setLoadingAvatars] = useState<Record<string, boolean>>({});

  const getInitials = useCallback((nickname?: string) => {
    if (!nickname) return '?';
    return nickname
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [workouts, ownSessions] = await Promise.all([
        repository.fetchAllFriendsRecentWorkouts(user.uid, 150),
        repository.fetchRecentWorkoutSessions(user.uid, 300),
      ]);

      setFriendsWorkouts(workouts);
      setMySessions(ownSessions);
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (!user) return [];

    const allRows: Array<WorkoutSession & { ownerId: string; ownerNickname?: string; ownerPhotoURL?: string }> = [
      ...mySessions.map((session) => ({
        ...session,
        ownerId: user.uid,
        ownerNickname: userProfile?.nickname || 'Ty',
        ownerPhotoURL: userProfile?.photoURL,
      })),
      ...friendsWorkouts.map((session) => ({
        ...session,
        ownerId: session.friendId,
        ownerNickname: session.friendNickname || 'Przyjaciel',
        ownerPhotoURL: session.friendPhotoURL,
      })),
    ];

    const selectedRows = allRows.filter((session) => normalizeExerciseName(session.exerciseName) === exerciseKey);

    const grouped = new Map<string, LeaderboardEntry>();

    selectedRows.forEach((session) => {
      const bestWeight = getSessionBestWeight(session);
      const current = grouped.get(session.ownerId);

      if (!current) {
        grouped.set(session.ownerId, {
          userId: session.ownerId,
          nickname: session.ownerNickname || 'Użytkownik',
          photoURL: session.ownerPhotoURL,
          bestWeight,
          latestDate: session.date,
          sessionsCount: 1,
        });
        return;
      }

      grouped.set(session.ownerId, {
        ...current,
        bestWeight: Math.max(current.bestWeight, bestWeight),
        latestDate: session.date.toMillis() > current.latestDate.toMillis() ? session.date : current.latestDate,
        sessionsCount: current.sessionsCount + 1,
      });
    });

    return [...grouped.values()].sort((a, b) => {
      if (b.bestWeight !== a.bestWeight) {
        return b.bestWeight - a.bestWeight;
      }
      return b.latestDate.toMillis() - a.latestDate.toMillis();
    });
  }, [exerciseKey, friendsWorkouts, mySessions, user, userProfile?.nickname, userProfile?.photoURL]);

  const podiumFirst = leaderboard[0];
  const podiumSecond = leaderboard[1];
  const podiumThird = leaderboard[2];
  const restRows = leaderboard.slice(3);

  const renderPodiumCard = (
    entry: LeaderboardEntry | undefined,
    place: 1 | 2 | 3,
    height: number,
    accentColors: readonly [string, string],
  ) => {
    if (!entry) {
      return (
        <View style={styles.podiumWrap}>
          <View style={styles.podiumAvatarGhost} />
          <Text numberOfLines={1} style={styles.podiumNicknameGhost}>Brak</Text>
          <Text style={styles.podiumWeightGhost}>- kg</Text>
          <View style={[styles.podiumColumn, styles.podiumColumnGhost, { height }]}>
            <Text style={styles.podiumPlaceGhost}>#{place}</Text>
          </View>
        </View>
      );
    }

    const isWinner = place === 1;

    return (
      <View style={styles.podiumWrap}>
        {isWinner && (
          <View style={styles.crownWrap}>
            <Ionicons name="trophy" size={14} color="#B07A00" />
          </View>
        )}
        {entry.photoURL ? (
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: entry.photoURL }} 
              style={styles.podiumAvatar}
              onLoadStart={() => setLoadingAvatars(prev => ({ ...prev, [entry.userId]: true }))}
              onLoadEnd={() => setLoadingAvatars(prev => ({ ...prev, [entry.userId]: false }))}
            />
            {loadingAvatars[entry.userId] && (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.podiumAvatar, styles.podiumAvatarPlaceholder]}>
            <Text style={styles.podiumAvatarInitials}>{getInitials(entry.nickname)}</Text>
          </View>
        )}
        <Text numberOfLines={1} style={styles.podiumNickname}>{entry.nickname}</Text>
        <Text style={[styles.podiumWeight, { color: accentColors[1] }]}>{entry.bestWeight.toFixed(1)} kg</Text>
        <LinearGradient
          colors={[accentColors[0], accentColors[1]]}
          start={{ x: 0.08, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.podiumColumn, { height }, isWinner && styles.podiumColumnWinner]}
        >
          <Text style={styles.podiumPlace}>#{place}</Text>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerSubtitle}>Ranking ćwiczenia</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
        </View>
      </View>

      {leaderboard.length === 0 ? (
        <View style={styles.centerContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="trophy-outline" size={58} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Brak wyników</Text>
          <Text style={styles.emptyMessage}>Nikt ze znajomych nie wykonał jeszcze tego ćwiczenia</Text>
        </View>
      ) : (
        <FlatList
          data={restRows}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View>
              <View style={styles.podiumContainer}>
                {renderPodiumCard(podiumSecond, 2, 88, ['#E7ECF3', '#94A3B8'])}
                {renderPodiumCard(podiumFirst, 1, 112, ['#FDE68A', '#F59E0B'])}
                {renderPodiumCard(podiumThird, 3, 74, ['#E6B88A', '#B87333'])}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pozostali zawodnicy</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyRestContainer}>
              <Text style={styles.emptyRestText}>Kolejni zawodnicy pojawią się tutaj.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rowPosition}>#{index + 4}</Text>
              {item.photoURL ? (
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: item.photoURL }} 
                    style={styles.rowAvatar}
                    onLoadStart={() => setLoadingAvatars(prev => ({ ...prev, [item.userId]: true }))}
                    onLoadEnd={() => setLoadingAvatars(prev => ({ ...prev, [item.userId]: false }))}
                  />
                  {loadingAvatars[item.userId] && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.rowAvatar, styles.podiumAvatarPlaceholder]}>
                  <Text style={styles.rowInitials}>{getInitials(item.nickname)}</Text>
                </View>
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.nickname}</Text>
                <Text style={styles.rowMeta}>{item.sessionsCount} sesji · {getTimeAgo(item.latestDate)}</Text>
              </View>
              <Text style={styles.rowWeight}>{item.bestWeight.toFixed(1)} kg</Text>
            </View>
          )}
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
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
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
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  podiumContainer: {
    marginTop: 18,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  podiumWrap: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  crownWrap: {
    marginBottom: 4,
    backgroundColor: '#F4B40030',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  podiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: colors.card,
  },
  podiumAvatarGhost: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  podiumAvatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumAvatarInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  podiumNickname: {
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  podiumNicknameGhost: {
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  podiumWeight: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 6,
  },
  podiumWeightGhost: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  podiumColumn: {
    width: '92%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  podiumColumnWinner: {
    borderWidth: 2,
    borderColor: '#B07A00',
  },
  podiumColumnGhost: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  podiumPlace: {
    color: 'white',
    fontSize: 19,
    fontWeight: '800',
  },
  podiumPlaceGhost: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyRestContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  emptyRestText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowPosition: {
    width: 30,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  rowInitials: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rowWeight: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
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
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
