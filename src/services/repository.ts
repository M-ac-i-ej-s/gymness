import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Exercise, Workout, WorkoutSession, UserPublicProfile, Friend, FriendRequest, CommunityPost, Impression } from '../types/models';

const userCollection = (userId: string, collectionName: string) =>
  collection(db, 'users', userId, collectionName);

const userDoc = (userId: string, collectionName: string, id: string) =>
  doc(db, 'users', userId, collectionName, id);

const toExercise = (id: string, data: any): Exercise => ({
  id,
  name: data.name ?? '',
  type: data.type ?? 'COMPOUND',
  goal: data.goal ?? 'HYPERTROPHY',
  targetSets: data.targetSets ?? 3,
  currentWeight: Number(data.currentWeight ?? 0),
  createdAt: data.createdAt ?? Timestamp.now(),
  lastUpdated: data.lastUpdated ?? Timestamp.now(),
});

const toWorkout = (id: string, data: any): Workout => ({
  id,
  name: data.name ?? '',
  exerciseIds: Array.isArray(data.exerciseIds) ? data.exerciseIds : [],
  createdAt: data.createdAt ?? Timestamp.now(),
});

const toWorkoutSession = (id: string, data: any): WorkoutSession => {
  const sets = Array.isArray(data.sets) ? data.sets : [];
  const avgRir = sets.filter((s: any) => s.rir != null).length > 0
    ? sets.filter((s: any) => s.rir != null).reduce((acc: number, s: any) => acc + Number(s.rir ?? 0), 0) /
      sets.filter((s: any) => s.rir != null).length
    : null;
  
  return {
    id,
    exerciseId: data.exerciseId ?? '',
    exerciseName: data.exerciseName ?? '',
    workoutId: data.workoutId,
    workoutName: data.workoutName,
    date: data.date ?? Timestamp.now(),
    sets,
    weight: Number(data.weight ?? 0),
    goal: data.goal ?? 'HYPERTROPHY',
    notes: data.notes,
    shouldIncreaseWeight: sets.every((s: any) => s.reps >= 10) && sets.every((s: any) => s.rir == null || s.rir <= 1), // Simplified check
    averageRIR: avgRir,
  };
};

const toCommunityPost = (id: string, data: any): CommunityPost => ({
  id,
  userId: data.userId ?? '',
  nickname: data.nickname ?? '',
  photoURL: data.photoURL,
  postType: data.postType ?? 'weight_increase',
  exerciseName: data.exerciseName ?? '',
  weight: Number(data.weight ?? 0),
  message: data.message ?? '',
  createdAt: data.createdAt ?? Timestamp.now(),
  impressions: data.impressions ?? {},
});

const removeUndefinedFields = <T extends Record<string, any>>(data: T): Partial<T> =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;

const isValidFirestoreUserId = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();

  if (trimmed.length < 6) {
    return false;
  }

  // Guard against placeholder/template values persisted to Firestore.
  if (trimmed.includes('{') || trimmed.includes('}')) {
    return false;
  }

  return true;
};

const FRIEND_REQUEST_COOLDOWN_MS = 15_000;
const friendRequestCooldownBySender = new Map<string, number>();

export const repository = {
  observeExercises(userId: string, callback: (rows: Exercise[]) => void, onError: (e: Error) => void) {
    const exercisesCollection = userCollection(userId, 'exercises');
    const q = query(exercisesCollection, orderBy('lastUpdated', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => callback(snapshot.docs.map((d) => toExercise(d.id, d.data()))),
      (error) => onError(error as Error),
    );
  },

  observeWorkouts(userId: string, callback: (rows: Workout[]) => void, onError: (e: Error) => void) {
    const workoutsCollection = userCollection(userId, 'workouts');
    const q = query(workoutsCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => callback(snapshot.docs.map((d) => toWorkout(d.id, d.data()))),
      (error) => onError(error as Error),
    );
  },

  observeWorkoutSessions(userId: string, exerciseId: string, callback: (rows: WorkoutSession[]) => void, onError: (e: Error) => void) {
    const workoutSessionsCollection = userCollection(userId, 'workoutSessions');
    const q = query(workoutSessionsCollection, where('exerciseId', '==', exerciseId));
    return onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => toWorkoutSession(d.id, d.data()));
        rows.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        callback(rows);
      },
      (error) => onError(error as Error),
    );
  },

  async fetchWorkoutSessions(userId: string, exerciseId: string, itemLimit = 10) {
    const workoutSessionsCollection = userCollection(userId, 'workoutSessions');
    const q = query(workoutSessionsCollection, where('exerciseId', '==', exerciseId));
    const snapshot = await getDocs(q);
    const rows = snapshot.docs.map((d) => toWorkoutSession(d.id, d.data()));
    rows.sort((a, b) => b.date.toMillis() - a.date.toMillis());
    return rows.slice(0, itemLimit);
  },

  async fetchRecentWorkoutSessions(userId: string, itemLimit = 20) {
    const workoutSessionsCollection = userCollection(userId, 'workoutSessions');
    const q = query(workoutSessionsCollection, orderBy('date', 'desc'), limit(itemLimit));
    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map((d) => toWorkoutSession(d.id, d.data()));
    return sessions;
  },

  async createExercise(userId: string, data: Omit<Exercise, 'id' | 'createdAt' | 'lastUpdated'>) {
    const exercisesCollection = userCollection(userId, 'exercises');
    await addDoc(exercisesCollection, {
      ...data,
      createdAt: Timestamp.now(),
      lastUpdated: Timestamp.now(),
    });
  },

  async updateExercise(userId: string, exercise: Exercise) {
    await updateDoc(userDoc(userId, 'exercises', exercise.id), {
      ...exercise,
      lastUpdated: Timestamp.now(),
    });
  },

  async deleteExercise(userId: string, exerciseId: string) {
    await deleteDoc(userDoc(userId, 'exercises', exerciseId));
  },

  async updateExerciseWeight(userId: string, exerciseId: string, newWeight: number) {
    await updateDoc(userDoc(userId, 'exercises', exerciseId), {
      currentWeight: newWeight,
      lastUpdated: Timestamp.now(),
    });
  },

  async createWorkout(userId: string, name: string, exerciseIds: string[]) {
    const workoutsCollection = userCollection(userId, 'workouts');
    await addDoc(workoutsCollection, {
      name,
      exerciseIds,
      createdAt: Timestamp.now(),
    });
  },

  async deleteWorkout(userId: string, workoutId: string) {
    await deleteDoc(userDoc(userId, 'workouts', workoutId));
  },

  async updateWorkout(userId: string, workoutId: string, name: string, exerciseIds: string[]) {
    await updateDoc(userDoc(userId, 'workouts', workoutId), {
      name,
      exerciseIds,
    });
  },

  async createWorkoutSession(userId: string, session: Omit<WorkoutSession, 'id' | 'date'>) {
    const workoutSessionsCollection = userCollection(userId, 'workoutSessions');
    // Filter out undefined values as Firebase doesn't accept them
    const data: any = {
      exerciseId: session.exerciseId,
      exerciseName: session.exerciseName,
      sets: session.sets,
      weight: session.weight,
      goal: session.goal,
      date: Timestamp.now(),
    };
    
    // Only add optional fields if they have values
    if (session.workoutId !== undefined) data.workoutId = session.workoutId;
    if (session.workoutName !== undefined) data.workoutName = session.workoutName;
    if (session.notes !== undefined) data.notes = session.notes;
    if (session.shouldIncreaseWeight !== undefined) data.shouldIncreaseWeight = session.shouldIncreaseWeight;
    if (session.averageRIR !== undefined) data.averageRIR = session.averageRIR;
    
    await addDoc(workoutSessionsCollection, data);
  },

  // Friends management methods
  async searchUsersByNickname(nickname: string): Promise<UserPublicProfile[]> {
    if (!nickname || nickname.trim().length === 0) {
      return [];
    }

    try {
      const usersRef = collection(db, 'users');
      const searchTerm = nickname.trim().toLowerCase();
      
      // Try searching using nicknameLowercase field for case-insensitive search
      const q = query(usersRef, where('nicknameLowercase', '>=', searchTerm), where('nicknameLowercase', '<=', searchTerm + '\uf8ff'), limit(50));
      const snapshot = await getDocs(q);
      
      // If nicknameLowercase field exists for some users, use those results
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          nickname: doc.data().nickname,
          photoURL: doc.data().photoURL,
        }));
      }
      
      // Fallback: search with original case and filter client-side
      // This handles backward compatibility for users without nicknameLowercase field
      const originalQuery = query(usersRef, where('nickname', '>=', nickname.trim()), where('nickname', '<=', nickname.trim() + '\uf8ff'), limit(50));
      const originalSnapshot = await getDocs(originalQuery);
      
      const results = originalSnapshot.docs.map((doc) => ({
        id: doc.id,
        nickname: doc.data().nickname,
        photoURL: doc.data().photoURL,
      }));
      
      // Also search with lowercase and uppercase first letter for better matching
      const lowerFirstQuery = query(usersRef, where('nickname', '>=', searchTerm), where('nickname', '<=', searchTerm + '\uf8ff'), limit(50));
      const lowerSnapshot = await getDocs(lowerFirstQuery);
      
      const upperFirstChar = nickname.trim().charAt(0).toUpperCase() + nickname.trim().slice(1).toLowerCase();
      const upperFirstQuery = query(usersRef, where('nickname', '>=', upperFirstChar), where('nickname', '<=', upperFirstChar + '\uf8ff'), limit(50));
      const upperSnapshot = await getDocs(upperFirstQuery);
      
      // Combine results and remove duplicates
      const allResults = [
        ...results,
        ...lowerSnapshot.docs.map((doc) => ({
          id: doc.id,
          nickname: doc.data().nickname,
          photoURL: doc.data().photoURL,
        })),
        ...upperSnapshot.docs.map((doc) => ({
          id: doc.id,
          nickname: doc.data().nickname,
          photoURL: doc.data().photoURL,
        })),
      ];
      
      // Remove duplicates based on id
      const uniqueResults = allResults.filter((user, index, self) =>
        index === self.findIndex((u) => u.id === user.id)
      );
      
      // Filter to only include users whose nickname contains the search term (case-insensitive)
      return uniqueResults.filter(user =>
        user.nickname?.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  },

  async sendFriendRequest(fromUserId: string, toUserId: string, fromNickname?: string, fromPhotoURL?: string): Promise<void> {
    try {
      if (fromUserId === toUserId) {
        throw new Error('Cannot send a friend request to yourself');
      }

      const now = Date.now();
      const senderCooldownUntil = friendRequestCooldownBySender.get(fromUserId) ?? 0;
      if (senderCooldownUntil > now) {
        throw new Error(`Please wait ${Math.ceil((senderCooldownUntil - now) / 1000)}s before sending another friend request`);
      }

      const friendRequestRef = doc(db, 'users', toUserId, 'friendRequests', fromUserId);

      await setDoc(friendRequestRef, removeUndefinedFields({
        fromUserId,
        toUserId,
        fromNickname,
        fromPhotoURL,
        status: 'pending',
        createdAt: serverTimestamp(),
      }));

      friendRequestCooldownBySender.set(fromUserId, now + FRIEND_REQUEST_COOLDOWN_MS);
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  },

  async acceptFriendRequest(userId: string, requestId: string, friendId: string, friendNickname?: string, friendPhotoURL?: string): Promise<void> {
    try {
      const currentUserProfileRef = doc(db, 'users', userId);
      const currentUserProfileSnapshot = await getDoc(currentUserProfileRef);
      const currentUserData = currentUserProfileSnapshot.exists() ? currentUserProfileSnapshot.data() : undefined;

      const requestRef = doc(db, 'users', userId, 'friendRequests', requestId);
      const friendsRef = collection(db, 'users', userId, 'friends');
      const friendFriendsRef = collection(db, 'users', friendId, 'friends');

      const batch = writeBatch(db);
      batch.update(requestRef, {
        status: 'accepted',
      });

      batch.set(doc(friendsRef), removeUndefinedFields({
        userId: friendId,
        nickname: friendNickname,
        photoURL: friendPhotoURL,
        addedAt: serverTimestamp(),
      }));

      batch.set(doc(friendFriendsRef), removeUndefinedFields({
        userId,
        nickname: currentUserData?.nickname,
        photoURL: currentUserData?.photoURL,
        addedAt: serverTimestamp(),
      }));

      await batch.commit();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  },

  async declineFriendRequest(userId: string, requestId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId, 'friendRequests', requestId), {
        status: 'declined',
      });
    } catch (error) {
      console.error('Error declining friend request:', error);
      throw error;
    }
  },

  observeFriendRequests(userId: string, callback: (requests: FriendRequest[]) => void, onError: (e: Error) => void) {
    const friendRequestsRef = collection(db, 'users', userId, 'friendRequests');
    const q = query(friendRequestsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(
      q,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          id: doc.id,
          fromUserId: doc.data().fromUserId,
          toUserId: doc.data().toUserId,
          fromNickname: doc.data().fromNickname,
          fromPhotoURL: doc.data().fromPhotoURL,
          status: doc.data().status as 'pending' | 'accepted' | 'declined',
          createdAt: doc.data().createdAt,
        }));
        callback(requests);
      },
      (error) => onError(error as Error),
    );
  },

  async getFriends(userId: string): Promise<Friend[]> {
    try {
      const friendsRef = collection(db, 'users', userId, 'friends');
      const snapshot = await getDocs(friendsRef);

      return snapshot.docs
        .map((doc) => ({
          userId: doc.data().userId,
          nickname: doc.data().nickname,
          photoURL: doc.data().photoURL,
          addedAt: doc.data().addedAt,
        }))
        .filter((friend) => {
          const valid = isValidFirestoreUserId(friend.userId);

          if (!valid) {
            console.warn('Skipping friend record with invalid userId:', friend.userId);
          }

          return valid;
        }) as Friend[];
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  },

  async checkFriendStatus(userId: string, otherUserId: string): Promise<'friends' | 'pending' | 'none'> {
    try {
      // Check if already friends
      const friendsRef = collection(db, 'users', userId, 'friends');
      const friendsSnapshot = await getDocs(query(friendsRef, where('userId', '==', otherUserId)));
      
      if (!friendsSnapshot.empty) {
        return 'friends';
      }

      // Check if pending request
      const requestsRef = collection(db, 'users', userId, 'friendRequests');
      const requestsSnapshot = await getDocs(query(requestsRef, where('fromUserId', '==', otherUserId), where('status', '==', 'pending')));
      
      if (!requestsSnapshot.empty) {
        return 'pending';
      }

      return 'none';
    } catch (error) {
      console.error('Error checking friend status:', error);
      return 'none';
    }
  },

  async fetchFriendWorkoutSessions(friendUserId: string, itemLimit = 20): Promise<(WorkoutSession & { friendId: string; friendNickname?: string; friendPhotoURL?: string })[]> {
    try {
      // Get friend's profile info
      const friendSnapshot = await getDocs(query(collection(db, 'users'), where('__name__', '==', friendUserId)));
      
      let friendNickname: string | undefined;
      let friendPhotoURL: string | undefined;

      if (!friendSnapshot.empty) {
        const friendData = friendSnapshot.docs[0].data();
        friendNickname = friendData.nickname;
        friendPhotoURL = friendData.photoURL;
      }

      // Fetch friend's workout sessions
      const workoutSessionsCollection = userCollection(friendUserId, 'workoutSessions');
      const q = query(workoutSessionsCollection, orderBy('date', 'desc'), limit(itemLimit));
      const snapshot = await getDocs(q);
      
      const sessions = snapshot.docs.map((d) => ({
        ...toWorkoutSession(d.id, d.data()),
        friendId: friendUserId,
        friendNickname,
        friendPhotoURL,
      }));
      
      return sessions;
    } catch (error) {
      console.error(`Error fetching workout sessions for friend ${friendUserId}:`, error);
      return [];
    }
  },

  async fetchAllFriendsRecentWorkouts(userId: string, itemLimit = 30): Promise<(WorkoutSession & { friendId: string; friendNickname?: string; friendPhotoURL?: string })[]> {
    try {
      const friends = await this.getFriends(userId);
      
      // Fetch workouts from all friends
      const allWorkouts: (WorkoutSession & { friendId: string; friendNickname?: string; friendPhotoURL?: string })[] = [];
      
      for (const friend of friends) {
        if (!isValidFirestoreUserId(friend.userId)) {
          continue;
        }

        const sessions = await this.fetchFriendWorkoutSessions(friend.userId, 10);
        allWorkouts.push(...sessions.map(s => ({
          ...s,
          friendNickname: friend.nickname,
          friendPhotoURL: friend.photoURL,
        })));
      }
      
      // Sort by date descending and limit
      allWorkouts.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      return allWorkouts.slice(0, itemLimit);
    } catch (error) {
      console.error('Error fetching all friends recent workouts:', error);
      return [];
    }
  },

  // Community posts methods
  async createCommunityPost(userId: string, post: Omit<CommunityPost, 'id' | 'createdAt'>): Promise<void> {
    try {
      const postsRef = collection(db, 'communityPosts');
      await addDoc(postsRef, {
        ...post,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error creating community post:', error);
      throw error;
    }
  },

  async fetchCommunityPosts(friendIds: string[], itemLimit = 50): Promise<CommunityPost[]> {
    try {
      if (friendIds.length === 0) {
        return [];
      }

      const postsRef = collection(db, 'communityPosts');
      const q = query(
        postsRef,
        where('userId', 'in', friendIds),
        orderBy('createdAt', 'desc'),
        limit(itemLimit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => toCommunityPost(doc.id, doc.data()));
    } catch (error) {
      console.error('Error fetching community posts:', error);
      return [];
    }
  },

  observeCommunityPosts(friendIds: string[], callback: (posts: CommunityPost[]) => void, onError: (e: Error) => void) {
    try {
      if (friendIds.length === 0) {
        callback([]);
        return () => {};
      }

      const postsRef = collection(db, 'communityPosts');
      const q = query(
        postsRef,
        where('userId', 'in', friendIds),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const posts = snapshot.docs.map((doc) => toCommunityPost(doc.id, doc.data()));
          callback(posts);
        },
        (error) => onError(error as Error),
      );
    } catch (error) {
      onError(error as Error);
      return () => {};
    }
  },

  async addImpression(postId: string, userId: string, impression: Impression): Promise<void> {
    try {
      const postRef = doc(db, 'communityPosts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const currentData = postSnap.data();
        const impressions = currentData.impressions ?? {};
        impressions[userId] = impression;
        
        await updateDoc(postRef, {
          impressions,
        });
      }
    } catch (error) {
      console.error('Error adding impression:', error);
      throw error;
    }
  },

  async removeImpression(postId: string, userId: string): Promise<void> {
    try {
      const postRef = doc(db, 'communityPosts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const currentData = postSnap.data();
        const impressions = currentData.impressions ?? {};
        delete impressions[userId];
        
        await updateDoc(postRef, {
          impressions,
        });
      }
    } catch (error) {
      console.error('Error removing impression:', error);
      throw error;
    }
  },
};
