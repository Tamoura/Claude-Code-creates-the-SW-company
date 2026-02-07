import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import { getRiskColor } from '../lib/theme';

interface FactorBarProps {
  name: string;
  score: number;
  detail: string;
}

export function FactorBar({
  name,
  score,
  detail,
}: FactorBarProps): React.JSX.Element {
  const barColor = getRiskColor(score);
  const barWidth = `${Math.min(Math.max(score, 0), 100)}%` as const;

  return (
    <View style={styles.container} testID={`factor-${name}`}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={[styles.score, { color: barColor }]}>{score}</Text>
      </View>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: barWidth, backgroundColor: barColor },
          ]}
          testID={`factor-bar-${name}`}
        />
      </View>
      <Text style={styles.detail} numberOfLines={2}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  score: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  barBackground: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  barFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  detail: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});
