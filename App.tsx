import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WorkoutProvider } from './src/store/WorkoutContext';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { isFirebaseConfigured } from './src/services/firebase';
import { colors } from './src/theme/colors';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [fbReady, setFbReady] = useState(false);
  const [fbConfigured, setFbConfigured] = useState(false);

  useEffect(() => {
    setFbReady(true);
    setFbConfigured(isFirebaseConfigured());
  }, []);

  if (!fbReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Inicjalizacja...</Text>
      </View>
    );
  }

  if (!fbConfigured) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Firebase nie skonfigurowany</Text>
        <Text style={styles.errorMessage}>
          Proszę ustawić zmienne środowiskowe Firebase w pliku .env
        </Text>
        <Text style={styles.errorHint}>
          Dodaj EXPO_PUBLIC_FIREBASE_PROJECT_ID i inne zmienne do .env
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <WorkoutProvider>
        <StatusBar style="dark" />
        <AppContent />
      </WorkoutProvider>
    </AuthProvider>
  );
}

const AppContent = () => {
  const { isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text style={styles.loadingText}>Ładowanie konta...</Text>
      </View>
    );
  }

  return <RootNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
