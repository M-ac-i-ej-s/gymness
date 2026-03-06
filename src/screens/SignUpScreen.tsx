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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { useAuth } from '../store/AuthContext';
import { AuthStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export const SignUpScreen = ({ navigation }: Props) => {
  const { signUp, isAuthenticating, errorMessage, clearError, checkNicknameAvailability } = useAuth();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaExpectedAnswer, setCaptchaExpectedAnswer] = useState<number | null>(null);
  const [captchaInput, setCaptchaInput] = useState('');

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

  const regenerateCaptcha = () => {
    const left = Math.floor(Math.random() * 8) + 1;
    const right = Math.floor(Math.random() * 8) + 1;
    setCaptchaQuestion(`${left} + ${right}`);
    setCaptchaExpectedAnswer(left + right);
    setCaptchaInput('');
  };

  useEffect(() => {
    regenerateCaptcha();
  }, []);

  const handleNicknameChange = async (value: string) => {
    setNickname(value);
    setNicknameError(null);

    if (value.trim().length > 0) {
      const isAvailable = await checkNicknameAvailability(value.trim());
      if (!isAvailable) {
        setNicknameError('Ten nick jest już zajęty');
      }
    }
  };

  const pickImage = async () => {
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
      setPhotoUri(result.assets[0].uri);
    }
  };

  const isFormValid = useMemo(
    () =>
      name.trim().length > 0 &&
      surname.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length >= 6 &&
      captchaInput.trim().length > 0 &&
      !nicknameError,
    [name, surname, email, password, captchaInput, nicknameError],
  );

  const handleSignUp = async () => {
    if (captchaExpectedAnswer == null || Number(captchaInput.trim()) !== captchaExpectedAnswer) {
      Alert.alert('Captcha', 'Niepoprawny wynik. Spróbuj ponownie.');
      regenerateCaptcha();
      return;
    }

    const didSignUp = await signUp(email, password, nickname.trim() || undefined, photoUri || undefined);

    if (didSignUp) {
      navigation.replace('VerifyAccount', { email: email.trim() });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Create Account</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.formCard}>
        <Pressable onPress={pickImage} style={styles.photoPickerContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.photoPlaceholderText}>Dodaj zdjęcie (opcjonalne)</Text>
            </View>
          )}
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          autoCapitalize="words"
          onChangeText={setName}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput
          style={styles.input}
          placeholder="Surname"
          value={surname}
          autoCapitalize="words"
          onChangeText={setSurname}
          placeholderTextColor={colors.textSecondary}
        />
        <View>
          <TextInput
            style={[styles.input, nicknameError && styles.inputError]}
            placeholder="Nickname (opcjonalny)"
            value={nickname}
            autoCapitalize="none"
            onChangeText={handleNicknameChange}
            placeholderTextColor={colors.textSecondary}
          />
          {nicknameError ? <Text style={styles.errorText}>{nicknameError}</Text> : null}
        </View>
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
          placeholder="Password (min. 6 characters)"
          value={password}
          secureTextEntry
          onChangeText={setPassword}
          placeholderTextColor={colors.textSecondary}
        />

        <View style={styles.captchaRow}>
          <Text style={styles.captchaLabel}>Captcha: {captchaQuestion} =</Text>
          <TextInput
            style={[styles.input, styles.captchaInput]}
            placeholder="Result"
            value={captchaInput}
            keyboardType="number-pad"
            onChangeText={setCaptchaInput}
            placeholderTextColor={colors.textSecondary}
          />
          <Pressable onPress={regenerateCaptcha} style={styles.captchaRefreshButton}>
            <Ionicons name="refresh" size={18} color={colors.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={handleSignUp}
          disabled={!isFormValid || isAuthenticating}
          style={({ pressed }) => [
            styles.primaryButton,
            (!isFormValid || isAuthenticating) && styles.buttonDisabled,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          disabled={isAuthenticating}
          style={({ pressed }) => [
            styles.secondaryButton,
            isAuthenticating && styles.buttonDisabled,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
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
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 60,
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
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
  captchaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  captchaLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  captchaInput: {
    flex: 1,
  },
  captchaRefreshButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
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
  buttonDisabled: {
    opacity: 0.45,
  },
  loader: {
    marginTop: 6,
  },
  photoPickerContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.cardSecondary,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 4,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
