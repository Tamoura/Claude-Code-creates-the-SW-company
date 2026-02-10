import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EventIcon } from './EventIcon';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';
import type { ActivityEvent } from '../types';

interface ActivityItemProps {
  event: ActivityEvent;
}

function formatTime(isoTime: string): string {
  const date = new Date(isoTime);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ActivityItem({ event }: ActivityItemProps): React.JSX.Element {
  return (
    <View style={styles.container} testID={`activity-item-${event.id}`}>
      <EventIcon type={event.type} size={40} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.author}>{event.author}</Text>
          <Text style={styles.separator}>in</Text>
          <Text style={styles.repo}>{event.repo}</Text>
        </View>
      </View>
      <Text style={styles.time}>{formatTime(event.time)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  author: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  separator: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginHorizontal: spacing.xs,
  },
  repo: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    minWidth: 50,
    textAlign: 'right',
  },
});
