import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { colors } from '../theme/colors';
import { useAuth } from '../store/AuthContext';
import { AuthStackParamList } from '../types/navigation';

WebBrowser.maybeCompleteAuthSession();

const isGoogleConfigured = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
);

export const AuthMenuScreen = ({ navigation }: NativeStackScreenProps<AuthStackParamList, 'AuthMenu'>) => {
  const { logIn, signInWithGoogleIdToken, isAuthenticating, errorMessage, clearError, forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type === 'success' && response.params.id_token) {
      signInWithGoogleIdToken(response.params.id_token);
      return;
    }

    if (response.type === 'error') {
      Alert.alert('Błąd logowania Google', 'Nie udało się zalogować kontem Google.');
    }
  }, [response, signInWithGoogleIdToken]);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    Alert.alert('Uwaga', errorMessage, [
      {
        text: 'OK',
        onPress: clearError,
      },
    ]);
  }, [clearError, errorMessage]);

  const isFormValid = useMemo(() => email.trim().length > 0 && password.length >= 6, [email, password]);

  const handleLogIn = async () => {
    await logIn(email, password);
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleConfigured) {
      Alert.alert('Google Login', 'Brakuje konfiguracji Google Client ID w .env.');
      return;
    }

    await promptAsync();
  };

  const handleForgotPassword = () => {
    Alert.prompt(
      'Resetowanie hasła',
      'Wpisz swój adres email, aby otrzymać link do resetowania hasła.',
      [
        {
          text: 'Anuluj',
          style: 'cancel',
        },
        {
          text: 'Wyślij',
          onPress: async (inputEmail) => {
            if (inputEmail && inputEmail.trim().length > 0) {
              await forgotPassword(inputEmail.trim());
            }
          },
        },
      ],
      'plain-text',
      email,
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Gymness</Text>
        <Text style={styles.subtitle}>Twoje treningi, Twoje konto</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setEmail}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Hasło (min. 6 znaków)"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          placeholderTextColor={colors.textSecondary}
        />

        <Pressable onPress={handleForgotPassword} disabled={isAuthenticating} style={styles.forgotPasswordContainer}>
          <Text style={styles.forgotPasswordText}>Zapomniałeś hasła?</Text>
        </Pressable>

        <Pressable
          onPress={handleLogIn}
          disabled={!isFormValid || isAuthenticating}
          style={({ pressed }) => [
            styles.primaryButton,
            (!isFormValid || isAuthenticating) && styles.buttonDisabled,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('SignUp')}
          disabled={isAuthenticating}
          style={({ pressed }) => [
            styles.secondaryButton,
            isAuthenticating && styles.buttonDisabled,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.secondaryButtonText}>Sign Up</Text>
        </Pressable>

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={!request || isAuthenticating}
          style={({ pressed }) => [
            styles.googleButton,
            (!request || isAuthenticating) && styles.buttonDisabled,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.googleButtonText}>Log In with Google</Text>
        </Pressable>

        {isAuthenticating ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: 24,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 12,
    marginLeft: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },
  formCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 0.5,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.cardSecondary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  googleButton: {
    backgroundColor: colors.text,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  googleButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  loader: {
    marginTop: 6,
  },
  forgotPasswordContainer: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
});
