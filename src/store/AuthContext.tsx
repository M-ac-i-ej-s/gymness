import React, { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// @ts-ignore - expo-image-manipulator types may not be fully recognized
import * as ImageManipulator from 'expo-image-manipulator';
import { auth, db, storage } from '../services/firebase';
import { enableNotifications, disableNotifications, getPushNotificationToken } from '../utils/notifications';

type UserProfile = {
  notificationsEnabled: boolean;
  isPrivate?: boolean;
  nickname?: string;
  displayName?: string;
  photoURL?: string;
  pushToken?: string;
};

type AuthContextValue = {
  user: User | null;
  userProfile: UserProfile | null;
  isInitializing: boolean;
  isAuthenticating: boolean;
  errorMessage: string | null;
  clearError: () => void;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname?: string, photoUri?: string) => Promise<boolean>;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  logOut: () => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setIsPrivate: (isPrivate: boolean) => Promise<void>;
  checkNicknameAvailability: (nickname: string) => Promise<boolean>;
  updateNickname: (nickname: string) => Promise<void>;
  updatePhoto: (photoUri: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
};

const defaultProfile: UserProfile = {
  notificationsEnabled: true,
};

const fallbackError = 'An unexpected error occurred';
const MAX_FAILED_LOGIN_ATTEMPTS = 3;
const BASE_LOGIN_COOLDOWN_MS = 30_000;

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginFailuresRef = useRef<Map<string, { attempts: number; cooldownUntil: number }>>(new Map());

  const clearError = useCallback(() => setErrorMessage(null), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsInitializing(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          await setDoc(userRef, {
            email: user.email ?? '',
            notificationsEnabled: true,
            createdAt: new Date(),
          });
          setUserProfile(defaultProfile);
          return;
        }

        const data = snapshot.data();
        setUserProfile({
          notificationsEnabled: Boolean(data.notificationsEnabled ?? true),
          isPrivate: Boolean(data.isPrivate ?? false),
          nickname: data.nickname,
          displayName: data.displayName,
          photoURL: data.photoURL,
          pushToken: data.pushToken,
        });
      },
      (error) => {
        setErrorMessage(`User profile error: ${error.message ?? fallbackError}`);
      },
    );

    return unsubscribe;
  }, [user]);

  // Auto-register push token when user logs in with notifications enabled
  useEffect(() => {
    if (!user || !userProfile) {
      return;
    }

    if (userProfile.notificationsEnabled && !userProfile.pushToken) {
      const registerPushToken = async () => {
        try {
          const token = await getPushNotificationToken();
          if (token && user.uid) {
            await updateDoc(doc(db, 'users', user.uid), {
              pushToken: token,
            });
            console.log('Push token registered on login:', token);
          }
        } catch (error) {
          console.log('Could not register push token on login:', error);
        }
      };

      registerPushToken();
    }
  }, [user, userProfile]);

  const logIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const loginState = loginFailuresRef.current.get(normalizedEmail);
    const now = Date.now();

    if (loginState && loginState.cooldownUntil > now) {
      const secondsLeft = Math.ceil((loginState.cooldownUntil - now) / 1000);
      setErrorMessage(`Too many failed attempts. Try again in ${secondsLeft}s.`);
      return;
    }

    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);

      if (!userCredential.user.emailVerified) {
        setErrorMessage('Please verify your email address before signing in.');
        await signOut(auth);
        setIsAuthenticating(false);
        return;
      }

      loginFailuresRef.current.delete(normalizedEmail);
    } catch (error: any) {
      const authErrorCode = String(error?.code ?? '');
      const shouldCountFailure = authErrorCode === 'auth/invalid-credential' || authErrorCode === 'auth/wrong-password' || authErrorCode === 'auth/user-not-found';

      if (shouldCountFailure) {
        const previous = loginFailuresRef.current.get(normalizedEmail) ?? { attempts: 0, cooldownUntil: 0 };
        const attempts = previous.attempts + 1;

        if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          const cooldownMultiplier = Math.floor(attempts / MAX_FAILED_LOGIN_ATTEMPTS);
          const cooldownMs = BASE_LOGIN_COOLDOWN_MS * Math.max(1, cooldownMultiplier);
          loginFailuresRef.current.set(normalizedEmail, {
            attempts,
            cooldownUntil: Date.now() + cooldownMs,
          });

          setErrorMessage(`Too many failed attempts. Try again in ${Math.ceil(cooldownMs / 1000)}s.`);
          return;
        }

        loginFailuresRef.current.set(normalizedEmail, {
          attempts,
          cooldownUntil: 0,
        });
      }

      setErrorMessage(`Sign in error: ${error.message ?? fallbackError}`);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const checkNicknameAvailability = useCallback(async (nickname: string): Promise<boolean> => {
    if (!nickname || nickname.trim().length === 0) {
      return false;
    }

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('nickname', '==', nickname.trim()));
      const snapshot = await getDocs(q);
      return snapshot.empty;
    } catch (error: any) {
      setErrorMessage(`Nickname validation error: ${error.message ?? fallbackError}`);
      return false;
    }
  }, []);

  const uploadPhoto = async (userId: string, photoUri: string): Promise<string> => {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: 500, height: 500 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );

    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `userPhotos/${userId}/${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const signUp = useCallback(async (email: string, password: string, nickname?: string, photoUri?: string) => {
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      if (nickname && nickname.trim().length > 0) {
        const isNicknameAvailable = await checkNicknameAvailability(nickname);
        if (!isNicknameAvailable) {
          setErrorMessage('This nickname is already taken');
          setIsAuthenticating(false);
          return false;
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const userId = userCredential.user.uid;

      await sendEmailVerification(userCredential.user);

      let photoURL: string | undefined;
      if (photoUri) {
        photoURL = await uploadPhoto(userId, photoUri);
      }

      await setDoc(doc(db, 'users', userId), {
        email: email.trim(),
        nickname: nickname?.trim(),
        nicknameLowercase: nickname?.trim().toLowerCase(),
        displayName: nickname?.trim() || email.trim().split('@')[0],
        photoURL,
        notificationsEnabled: true,
        createdAt: new Date(),
      });

      await signOut(auth);
      return true;
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('This email address is already in use');
      } else {
        setErrorMessage(`Sign up error: ${error.message ?? fallbackError}`);
      }
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [checkNicknameAvailability]);

  const signInWithGoogleIdToken = useCallback(async (idToken: string) => {
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
    } catch (error: any) {
      setErrorMessage(`Google sign-in error: ${error.message ?? fallbackError}`);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logOut = useCallback(async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      await signOut(auth);
    } catch (error: any) {
      setErrorMessage(`Sign out error: ${error.message ?? fallbackError}`);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const setNotificationsEnabled = useCallback(async (enabled: boolean) => {
    if (!user) {
      return;
    }

    const previousEnabled = Boolean(userProfile?.notificationsEnabled ?? true);
    setUserProfile((prev) => {
      if (!prev) {
        return { ...defaultProfile, notificationsEnabled: enabled };
      }

      return {
        ...prev,
        notificationsEnabled: enabled,
      };
    });
    setErrorMessage(null);

    try {
      if (enabled) {
        const result = await enableNotifications();

        if (!result.success) {
          setUserProfile((prev) => {
            if (!prev) {
              return { ...defaultProfile, notificationsEnabled: previousEnabled };
            }

            return {
              ...prev,
              notificationsEnabled: previousEnabled,
            };
          });
          setErrorMessage('Could not enable notifications. Check device settings.');
          return;
        }

        await updateDoc(doc(db, 'users', user.uid), {
          notificationsEnabled: true,
          pushToken: result.token,
        });
      } else {
        await disableNotifications();

        await updateDoc(doc(db, 'users', user.uid), {
          notificationsEnabled: false,
        });
      }
    } catch (error: any) {
      setUserProfile((prev) => {
        if (!prev) {
          return { ...defaultProfile, notificationsEnabled: previousEnabled };
        }

        return {
          ...prev,
          notificationsEnabled: previousEnabled,
        };
      });
      setErrorMessage(`Settings save error: ${error.message ?? fallbackError}`);
    }
  }, [user, userProfile?.notificationsEnabled]);

  const updateNickname = useCallback(async (nickname: string) => {
    if (!user) {
      return;
    }

    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('nickname', '==', nickname.trim()));
      const snapshot = await getDocs(q);

      if (!snapshot.empty && snapshot.docs[0].id !== user.uid) {
        setErrorMessage('This nickname is already taken');
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        nickname: nickname.trim(),
        nicknameLowercase: nickname.trim().toLowerCase(),
      });
    } catch (error: any) {
      setErrorMessage(`Nickname update error: ${error.message ?? fallbackError}`);
    } finally {
      setIsAuthenticating(false);
    }
  }, [user]);

  const updatePhoto = useCallback(async (photoUri: string) => {
    if (!user) {
      return;
    }

    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const photoURL = await uploadPhoto(user.uid, photoUri);
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL,
      });
    } catch (error: any) {
      setErrorMessage(`Photo update error: ${error.message ?? fallbackError}`);
    } finally {
      setIsAuthenticating(false);
    }
  }, [user]);

  const setIsPrivate = useCallback(async (isPrivate: boolean) => {
    if (!user) {
      return;
    }

    const previousPrivate = Boolean(userProfile?.isPrivate ?? false);
    setUserProfile((prev) => {
      if (!prev) {
        return { ...defaultProfile, isPrivate };
      }

      return {
        ...prev,
        isPrivate,
      };
    });
    setErrorMessage(null);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isPrivate,
      });
    } catch (error: any) {
      setUserProfile((prev) => {
        if (!prev) {
          return { ...defaultProfile, isPrivate: previousPrivate };
        }

        return {
          ...prev,
          isPrivate: previousPrivate,
        };
      });
      setErrorMessage(`Settings save error: ${error.message ?? fallbackError}`);
    }
  }, [user, userProfile?.isPrivate]);

  const forgotPassword = useCallback(async (email: string) => {
    setIsAuthenticating(true);
    setErrorMessage(null);

    const genericResetMessage = 'If an account exists for this email, we sent a password reset link.';

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        console.log('Password reset request error:', error?.code ?? error);
      }
    } finally {
      setErrorMessage(genericResetMessage);
      setIsAuthenticating(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userProfile,
      isInitializing,
      isAuthenticating,
      errorMessage,
      clearError,
      logIn,
      signUp,
      signInWithGoogleIdToken,
      logOut,
      setNotificationsEnabled,
      setIsPrivate,
      checkNicknameAvailability,
      updateNickname,
      updatePhoto,
      forgotPassword,
    }),
    [
      user,
      userProfile,
      isInitializing,
      isAuthenticating,
      errorMessage,
      clearError,
      logIn,
      signUp,
      signInWithGoogleIdToken,
      logOut,
      setNotificationsEnabled,
      setIsPrivate,
      checkNicknameAvailability,
      updateNickname,
      updatePhoto,
      forgotPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
