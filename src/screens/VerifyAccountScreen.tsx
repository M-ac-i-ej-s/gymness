import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { AuthStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyAccount'>;

export const VerifyAccountScreen = ({ navigation, route }: Props) => {
  const email = route.params?.email;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="mail-open-outline" size={52} color={colors.primary} style={styles.icon} />
        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.description}>
          We sent a verification link to {email}. Open your email and verify your account before logging in.
        </Text>

        <Pressable
          onPress={() => navigation.replace('AuthMenu')}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.buttonText}>Verified</Text>
        </Pressable>
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
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  button: {
    width: '100%',
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
