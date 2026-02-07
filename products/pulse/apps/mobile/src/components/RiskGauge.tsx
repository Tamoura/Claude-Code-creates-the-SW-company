import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import { getRiskColor } from '../lib/theme';

interface RiskGaugeProps {
  score: number;
  level: 'low' | 'medium' | 'high';
  size?: number;
}

export function RiskGauge({
  score,
  level,
  size = 160,
}: RiskGaugeProps): React.JSX.Element {
  const riskColor = getRiskColor(score);
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      testID="risk-gauge"
      accessibilityLabel={`Sprint risk score ${score}, level ${level}`}
    >
      {/* Background circle using View */}
      <View
        style={[
          styles.circleBackground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: colors.surfaceLight,
          },
        ]}
      />
      {/* Progress indicator - simplified without SVG */}
      <View
        style={[
          styles.progressRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: riskColor,
            borderTopColor: progress < 0.25 ? 'transparent' : riskColor,
            borderRightColor: progress < 0.5 ? 'transparent' : riskColor,
            borderBottomColor: progress < 0.75 ? 'transparent' : riskColor,
            borderLeftColor: progress < 1 ? 'transparent' : riskColor,
            transform: [{ rotate: '-90deg' }],
          },
        ]}
      />
      {/* Score text */}
      <View style={styles.scoreContainer}>
        <Text
          style={[styles.score, { color: riskColor, fontSize: size * 0.28 }]}
          testID="risk-score"
        >
          {score}
        </Text>
        <View
          style={[
            styles.levelBadge,
            { backgroundColor: riskColor + '20' },
          ]}
        >
          <Text
            style={[styles.levelText, { color: riskColor }]}
            testID="risk-level"
          >
            {level.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
  },
  progressRing: {
    position: 'absolute',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontWeight: '800',
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  levelText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
