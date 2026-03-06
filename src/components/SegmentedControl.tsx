import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  tabs: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
};

export const SegmentedControl = ({ tabs, selectedIndex, onChange }: Props) => {
  return (
    <View style={styles.root}>
      {tabs.map((tab, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable key={tab} style={[styles.tab, selected && styles.tabSelected]} onPress={() => onChange(index)}>
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: '#E8E8ED',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabSelected: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextSelected: {
    color: colors.text,
  },
});
