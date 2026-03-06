import React, { useState, useEffect } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useAuth } from '../store/AuthContext';
import { repository } from '../services/repository';
import { UserStackParamList } from '../types/navigation';
import { FriendRequest } from '../types/models';

type Props = NativeStackScreenProps<UserStackParamList, 'UserPanel'>;

export const UserPanelScreen = ({ navigation }: Props) => {
  const { user, userProfile, setNotificationsEnabled, setIsPrivate, logOut, isAuthenticating, updateNickname, updatePhoto, checkNicknameAvailability } = useAuth();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [notificationsEnabledValue, setNotificationsEnabledValue] = useState(Boolean(userProfile?.notificationsEnabled ?? true));
  const [isPrivateValue, setIsPrivateValue] = useState(Boolean(userProfile?.isPrivate ?? false));
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSavingPrivate, setIsSavingPrivate] = useState(false);

  // Subscribe to friend requests
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = repository.observeFriendRequests(
      user.uid,
      (requests) => setFriendRequests(requests),
      (error) => console.error('Error observing friend requests:', error),
    );

    return unsubscribe;
  }, [user?.uid]);

  // Keep local switch state in sync with Firestore updates while allowing instant UI toggles.
  useEffect(() => {
    setNotificationsEnabledValue(Boolean(userProfile?.notificationsEnabled ?? true));
    setIsPrivateValue(Boolean(userProfile?.isPrivate ?? false));
  }, [userProfile?.notificationsEnabled, userProfile?.isPrivate]);

  const handleNotificationsToggle = async (value: boolean) => {
    setNotificationsEnabledValue(value);
    setIsSavingNotifications(true);
    try {
      await setNotificationsEnabled(value);
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handlePrivateToggle = async (value: boolean) => {
    setIsPrivateValue(value);
    setIsSavingPrivate(true);
    try {
      await setIsPrivate(value);
    } finally {
      setIsSavingPrivate(false);
    }
  };

  const handleEditNickname = () => {
    setNewNickname(userProfile?.nickname || '');
    setNicknameError(null);
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    if (newNickname.trim().length === 0) {
      setNicknameError('Nick nie może być pusty');
      return;
    }

    // Check if nickname is different from current
    if (newNickname.trim() === userProfile?.nickname) {
      setIsEditingNickname(false);
      return;
    }

    // Check availability
    const isAvailable = await checkNicknameAvailability(newNickname.trim());
    if (!isAvailable) {
      setNicknameError('Ten nick jest już zajęty');
      return;
    }

    await updateNickname(newNickname);
    setIsEditingNickname(false);
  };

  const handleChangePhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Brak uprawnień', 'Potrzebujemy uprawnień do dostępu do twojej galerii.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      await updatePhoto(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
        <Pressable onPress={handleChangePhoto} style={styles.photoContainer}>
          {userProfile?.photoURL ? (
            <>
              <Image 
                source={{ uri: userProfile.photoURL }} 
                style={styles.profilePhoto}
                onLoadStart={() => setIsPhotoLoading(true)}
                onLoadEnd={() => setIsPhotoLoading(false)}
                onError={() => setIsPhotoLoading(false)}
              />
              {isPhotoLoading && (
                <View style={styles.photoLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}
            </>
          ) : (
            <Ionicons name="person-circle-outline" size={80} color={colors.primary} />
          )}
          <View style={styles.cameraIconContainer}>
            <Ionicons name="camera" size={16} color="white" />
          </View>
        </Pressable>
        
        <Text style={styles.headerTitle}>Panel użytkownika</Text>
        
        {isEditingNickname ? (
          <View style={styles.nicknameEditContainer}>
            <TextInput
              style={[styles.nicknameInput, nicknameError && styles.inputError]}
              value={newNickname}
              onChangeText={(text) => {
                setNewNickname(text);
                setNicknameError(null);
              }}
              placeholder="Wpisz nick"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            {nicknameError ? <Text style={styles.errorText}>{nicknameError}</Text> : null}
            <View style={styles.nicknameButtons}>
              <Pressable onPress={() => setIsEditingNickname(false)} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Anuluj</Text>
              </Pressable>
              <Pressable onPress={handleSaveNickname} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Zapisz</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={handleEditNickname} style={styles.nicknameContainer}>
            <Text style={styles.nickname}>
              {userProfile?.nickname || 'Dodaj nick'}
            </Text>
            <Ionicons name="pencil" size={14} color={colors.primary} />
          </Pressable>
        )}
        
        <Text style={styles.headerEmail}>{user?.email ?? 'Brak emaila'}</Text>
      </View>

      <View style={styles.optionCard}>
        <View>
          <Text style={styles.optionTitle}>Powiadomienia</Text>
          <Text style={styles.optionHint}>Włącz / wyłącz powiadomienia</Text>
        </View>
        <Switch
          value={notificationsEnabledValue}
          onValueChange={handleNotificationsToggle}
          disabled={isSavingNotifications}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.card}
          style={styles.thinSwitch}
        />
      </View>

      <View style={styles.optionCard}>
        <View>
          <Text style={styles.optionTitle}>Zrób prywatne</Text>
          <Text style={styles.optionHint}>Pracuj w ciszy, bez karty społeczności</Text>
        </View>
        <Switch
          value={isPrivateValue}
          onValueChange={handlePrivateToggle}
          disabled={isSavingPrivate}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.card}
          style={styles.thinSwitch}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.navigationCard, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => navigation.navigate('RecentWorkouts')}
      >
        <View style={styles.navigationCardContent}>
          <Ionicons name="time" size={24} color={colors.primary} />
          <View style={styles.navigationCardTextContainer}>
            <Text style={styles.optionTitle}>Historia Treningów</Text>
            <Text style={styles.optionHint}>Zobacz swoje ostatnie treningi</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.navigationCard, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => navigation.navigate('ProgressMain')}
      >
        <View style={styles.navigationCardContent}>
          <Ionicons name="trending-up" size={24} color={colors.primary} />
          <View style={styles.navigationCardTextContainer}>
            <Text style={styles.optionTitle}>Mój Progres</Text>
            <Text style={styles.optionHint}>Śledź swoje postępy w ćwiczeniach</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.navigationCard, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => navigation.navigate('FindUsers')}
      >
        <View style={styles.navigationCardContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={24} color={colors.primary} />
            {friendRequests.length > 0 && (
              <View style={styles.badgeDotSmall} />
            )}
          </View>
          <View style={styles.navigationCardTextContainer}>
            <Text style={styles.optionTitle}>Znajmoi</Text>
            <Text style={styles.optionHint}>Wyszukaj i dodaj użytkowników</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        onPress={logOut}
        disabled={isAuthenticating}
        style={({ pressed }) => [styles.logoutButton, { opacity: pressed || isAuthenticating ? 0.7 : 1 }]}
      >
        <Ionicons name="log-out-outline" size={18} color="white" />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 14,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 18,
    marginTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  nicknameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  nickname: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  nicknameEditContainer: {
    width: '100%',
    gap: 8,
  },
  nicknameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.cardSecondary,
    textAlign: 'center',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
  },
  nicknameButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  headerEmail: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navigationCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navigationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navigationCardTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  optionHint: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
  },
  thinSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 1.0 }],
  },
  logoutButton: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  badgeDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.danger,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeDotSmall: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.card,
  },
  iconContainer: {
    position: 'relative',
  },
});
