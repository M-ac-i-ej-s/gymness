import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useAuth } from '../store/AuthContext';
import { repository } from '../services/repository';
import { UserStackParamList } from '../types/navigation';
import { UserPublicProfile, FriendRequest, Friend } from '../types/models';
import { showFriendRequestNotification } from '../utils/notifications';

type Props = NativeStackScreenProps<UserStackParamList, 'FindUsers'>;

export const FindUsersScreen = ({ navigation }: Props) => {
  const { user, userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, 'friends' | 'pending' | 'none'>>({});
  const [isLoadingStatusForUser, setIsLoadingStatusForUser] = useState<Record<string, boolean>>({});
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isLoadingRequest, setIsLoadingRequest] = useState<Record<string, boolean>>({});
  const [loadingAvatars, setLoadingAvatars] = useState<Record<string, boolean>>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [displayedFriendsCount, setDisplayedFriendsCount] = useState(5);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  
  // Track previous friend requests to detect new ones
  const previousFriendRequestIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // Subscribe to friend requests
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = repository.observeFriendRequests(
      user.uid,
      (requests) => {
        // Detect new friend requests and show notifications
        if (!isInitialLoad.current) {
          const currentRequestIds = new Set(requests.map(req => req.id));
          const newRequests = requests.filter(req => !previousFriendRequestIds.current.has(req.id));
          
          // Show notification for each new request
          newRequests.forEach(req => {
            showFriendRequestNotification(req.fromNickname || 'Ktoś', req.fromUserId);
          });
          
          previousFriendRequestIds.current = currentRequestIds;
        } else {
          // On initial load, just store the current IDs without showing notifications
          previousFriendRequestIds.current = new Set(requests.map(req => req.id));
          isInitialLoad.current = false;
        }
        
        setFriendRequests(requests);
      },
      (error) => console.error('Error observing friend requests:', error),
    );

    return unsubscribe;
  }, [user?.uid]);

  // Fetch friends list
  useEffect(() => {
    if (!user?.uid) return;

    const fetchFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const friendsList = await repository.getFriends(user.uid);
        setFriends(friendsList);
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [user?.uid]);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await repository.searchUsersByNickname(query.trim());
      // Filter out current user from results
      const filteredResults = results.filter((u) => u.id !== user?.uid);
      setSearchResults(filteredResults);

      // Check friend status for each result
      const statuses: Record<string, 'friends' | 'pending' | 'none'> = {};
      for (const result of filteredResults) {
        if (user?.uid) {
          const status = await repository.checkFriendStatus(user.uid, result.id);
          statuses[result.id] = status;
        }
      }
      setFriendStatuses(statuses);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Błąd', 'Nie udało się wyszukać użytkowników');
    } finally {
      setIsSearching(false);
    }
  }, [user?.uid]);

  const handleAddFriend = useCallback(
    async (friendId: string, friendNickname?: string, friendPhotoURL?: string) => {
      if (!user?.uid) return;

      setIsLoadingStatusForUser((prev) => ({ ...prev, [friendId]: true }));
      try {
        await repository.sendFriendRequest(user.uid, friendId, userProfile?.nickname, userProfile?.photoURL);
        
        // Update the status
        setFriendStatuses((prev) => ({ ...prev, [friendId]: 'pending' }));
        Alert.alert('Sukces', 'Zaproszenie do przyjaźni wysłane');
      } catch (error) {
        console.error('Error sending friend request:', error);
        Alert.alert('Błąd', 'Nie udało się wysłać zaproszenia');
      } finally {
        setIsLoadingStatusForUser((prev) => ({ ...prev, [friendId]: false }));
      }
    },
    [user?.uid, userProfile?.nickname, userProfile?.photoURL],
  );

  const handleAcceptFriendRequest = useCallback(
    async (requestId: string, fromUserId: string, fromNickname?: string, fromPhotoURL?: string) => {
      if (!user?.uid) return;

      setIsLoadingRequest((prev) => ({ ...prev, [requestId]: true }));
      try {
        await repository.acceptFriendRequest(user.uid, requestId, fromUserId, fromNickname, fromPhotoURL);
        Alert.alert('Sukces', 'Zaproszenie zaakceptowane');
      } catch (error) {
        console.error('Error accepting friend request:', error);
        Alert.alert('Błąd', 'Nie udało się zaakceptować zaproszenia');
      } finally {
        setIsLoadingRequest((prev) => ({ ...prev, [requestId]: false }));
      }
    },
    [user?.uid],
  );

  const handleDeclineFriendRequest = useCallback(
    async (requestId: string) => {
      if (!user?.uid) return;

      setIsLoadingRequest((prev) => ({ ...prev, [requestId]: true }));
      try {
        await repository.declineFriendRequest(user.uid, requestId);
        Alert.alert('Sukces', 'Zaproszenie odrzucone');
      } catch (error) {
        console.error('Error declining friend request:', error);
        Alert.alert('Błąd', 'Nie udało się odrzucić zaproszenia');
      } finally {
        setIsLoadingRequest((prev) => ({ ...prev, [requestId]: false }));
      }
    },
    [user?.uid],
  );

  const renderUserItem = ({ item }: { item: UserPublicProfile }) => {
    const status = friendStatuses[item.id] || 'none';
    const isLoading = isLoadingStatusForUser[item.id] || false;

    const getButtonConfig = () => {
      if (status === 'friends') {
        return {
          label: 'Przyjaciel',
          disabled: true,
          color: colors.primary,
          icon: 'checkmark-circle',
        };
      }
      if (status === 'pending') {
        return {
          label: 'Zaproszenie wysłane',
          disabled: true,
          color: colors.textSecondary,
          icon: 'hourglass-outline',
        };
      }
      return {
        label: 'Dodaj',
        disabled: false,
        color: colors.primary,
        icon: 'person-add',
      };
    };

    const buttonConfig = getButtonConfig();

    return (
      <View style={styles.userContainer}>
        <View style={styles.userInfo}>
          {item.photoURL ? (
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: item.photoURL }} 
                style={styles.avatar}
                onLoadStart={() => setLoadingAvatars(prev => ({ ...prev, [item.id]: true }))}
                onLoadEnd={() => setLoadingAvatars(prev => ({ ...prev, [item.id]: false }))}
              />
              {loadingAvatars[item.id] && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.nickname}>{item.nickname || 'Brak nicku'}</Text>
          </View>
        </View>
        <Pressable
          style={[styles.button, buttonConfig.disabled && styles.buttonDisabled]}
          onPress={() => handleAddFriend(item.id, item.nickname, item.photoURL)}
          disabled={buttonConfig.disabled || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={buttonConfig.color} />
          ) : (
            <>
              <Ionicons name={buttonConfig.icon as any} size={18} color={buttonConfig.color} />
              <Text style={[styles.buttonText, { color: buttonConfig.color }]}>{buttonConfig.label}</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  };

  const renderFriendRequest = ({ item }: { item: FriendRequest }) => {
    const isLoading = isLoadingRequest[item.id] || false;

    return (
      <View style={styles.requestContainer}>
        <View style={styles.requestInfo}>
          {item.fromPhotoURL ? (
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: item.fromPhotoURL }} 
                style={styles.requestAvatar}
                onLoadStart={() => setLoadingAvatars(prev => ({ ...prev, [`req_${item.id}`]: true }))}
                onLoadEnd={() => setLoadingAvatars(prev => ({ ...prev, [`req_${item.id}`]: false }))}
              />
              {loadingAvatars[`req_${item.id}`] && (
                <View style={[styles.avatarLoadingOverlay, styles.requestAvatarLoadingOverlay]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.requestAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person-circle-outline" size={36} color={colors.primary} />
            </View>
          )}
          <View style={styles.requestDetails}>
            <Text style={styles.requestNickname}>{item.fromNickname || 'Brak nicku'}</Text>
            <Text style={styles.requestText}>Chce być Twoim przyjacielem</Text>
          </View>
        </View>
        <View style={styles.requestButtons}>
          <Pressable
            style={[styles.requestButton, styles.acceptButton]}
            onPress={() => handleAcceptFriendRequest(item.id, item.fromUserId, item.fromNickname, item.fromPhotoURL)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark" size={18} color="white" />
            )}
          </Pressable>
          <Pressable
            style={[styles.requestButton, styles.declineButton]}
            onPress={() => handleDeclineFriendRequest(item.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="close" size={18} color={colors.danger} />
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    return (
      <View style={styles.friendContainer}>
        <View style={styles.friendInfo}>
          {item.photoURL ? (
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: item.photoURL }} 
                style={styles.friendAvatar}
                onLoadStart={() => setLoadingAvatars(prev => ({ ...prev, [`friend_${item.userId}`]: true }))}
                onLoadEnd={() => setLoadingAvatars(prev => ({ ...prev, [`friend_${item.userId}`]: false }))}
              />
              {loadingAvatars[`friend_${item.userId}`] && (
                <View style={[styles.avatarLoadingOverlay, styles.friendAvatarLoadingOverlay]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.friendAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendNickname}>{item.nickname || 'Brak nicku'}</Text>
          </View>
        </View>
        <View style={styles.friendBadge}>
          <Ionicons name="people" size={14} color={colors.primary} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Friend Requests Section - Always visible */}
      <View style={styles.requestsSection}>
        <Text style={styles.requestsSectionTitle}>Zaproszenia do przyjaźni ({friendRequests.length})</Text>
        {friendRequests.length > 0 ? (
          <FlatList
            data={friendRequests}
            renderItem={renderFriendRequest}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        ) : (
          <View style={styles.sectionEmptyState}>
            <Ionicons name="mail-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.sectionEmptyText}>Brak zaproszeń</Text>
          </View>
        )}
      </View>

      {/* Friends Section - Always visible */}
      <View style={styles.friendsSection}>
        <Text style={styles.friendsSectionTitle}>Twoi znajomi ({friends.length})</Text>
        {isLoadingFriends ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : friends.length > 0 ? (
          <>
            <FlatList
              data={friends.slice(0, displayedFriendsCount)}
              renderItem={renderFriendItem}
              keyExtractor={(item) => item.userId}
              scrollEnabled={false}
              nestedScrollEnabled={true}
            />
            {friends.length > displayedFriendsCount && (
              <Pressable 
                style={styles.loadMoreButton}
                onPress={() => setDisplayedFriendsCount(prev => prev + 5)}
              >
                <Text style={styles.loadMoreText}>Załaduj więcej</Text>
                <Ionicons name="chevron-down" size={16} color={colors.primary} />
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.sectionEmptyState}>
            <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.sectionEmptyText}>Brak znajomych</Text>
          </View>
        )}
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <Text style={styles.searchSectionTitle}>Szukaj nowych znajomych</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj użytkownika po nicku..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              performSearch(text);
            }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setFriendStatuses({});
            }}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {isSearching && <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />}

        {!isSearching && searchResults.length === 0 && searchQuery.length > 0 && (
          <View style={styles.searchEmptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Nie znaleziono użytkowników</Text>
          </View>
        )}

        {!isSearching && searchResults.length === 0 && searchQuery.length === 0 && (
          <View style={styles.searchEmptyContainer}>
            <Ionicons name="person-add-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Zacznij pisać nick aby wyszukać użytkownika</Text>
          </View>
        )}

        {!isSearching && searchResults.length > 0 && (
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={true}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  requestsSection: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    marginTop: 70,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  requestsSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  requestContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  requestDetails: {
    flex: 1,
  },
  requestNickname: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  requestButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  requestButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  declineButton: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
  },
  sectionEmptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  searchSection: {
    flex: 1,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  searchSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginTop: 24,
  },
  searchEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  listContainer: {
    paddingTop: 12,
    paddingBottom: 20,
  },
  userContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  nickname: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 12,
    gap: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestAvatarLoadingOverlay: {
    borderRadius: 26,
  },
  friendsSection: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  friendsSectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  friendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  friendInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  friendAvatarLoadingOverlay: {
    borderRadius: 18,
  },
  friendDetails: {
    flex: 1,
  },
  friendNickname: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  friendBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  loadMoreText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
