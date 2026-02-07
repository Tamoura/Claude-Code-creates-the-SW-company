import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';
import type { ActivityEventType } from '../types';

interface EventIconProps {
  type: ActivityEventType;
  size?: number;
}

const EVENT_CONFIG: Record<
  ActivityEventType,
  { label: string; color: string; icon: string }
> = {
  push: { label: 'Push', color: colors.eventPush, icon: '↑' },
  pr_opened: { label: 'PR Opened', color: colors.eventPrOpened, icon: '⊕' },
  pr_merged: { label: 'PR Merged', color: colors.eventPrMerged, icon: '⊗' },
  pr_closed: { label: 'PR Closed', color: colors.eventPrClosed, icon: '⊘' },
  deployment: {
    label: 'Deploy',
    color: colors.eventDeployment,
    icon: '▲',
  },
  review: { label: 'Review', color: colors.eventReview, icon: '◉' },
  comment: { label: 'Comment', color: colors.eventComment, icon: '◈' },
};

export function EventIcon({ type, size = 36 }: EventIconProps): React.JSX.Element {
  const config = EVENT_CONFIG[type] ?? EVENT_CONFIG.push;
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.color + '20',
        },
      ]}
      testID={`event-icon-${type}`}
      accessibilityLabel={config.label}
    >
      <Text
        style={[
          styles.icon,
          { fontSize: size * 0.45, color: config.color },
        ]}
      >
        {config.icon}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontWeight: '700',
  },
});
