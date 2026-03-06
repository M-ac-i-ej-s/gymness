import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  background: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, unit, background }) => (
  <View style={[styles.card, { backgroundColor: background }]}>
    <Text style={styles.title}>{title}</Text>
    <View style={styles.valueRow}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  </View>
);

interface ModernCardProps {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
}

export const ModernCard: React.FC<ModernCardProps> = ({ onPress, children, style }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.modernCard, { opacity: pressed ? 0.7 : 1 }, style]}>
    {children}
  </Pressable>
);

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, selected = false, onPress }) => (
  <Pressable
    onPress={onPress}
    style={{
      backgroundColor: selected ? colors.primary : colors.chip,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
    }}
  >
    <Text style={{ color: selected ? 'white' : colors.text, fontWeight: '500', fontSize: 13 }}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
    marginBottom: 4,
  },
  modernCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
});
