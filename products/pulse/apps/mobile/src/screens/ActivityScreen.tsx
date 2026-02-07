import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityItem } from '../components/ActivityItem';
import { useWebSocket } from '../hooks/useWebSocket';
import { colors, fontSize, spacing } from '../lib/theme';
import type { ActivityEvent } from '../types';

const MAX_EVENTS = 100;

export function ActivityScreen(): React.JSX.Element {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const handleEvent = useCallback((event: ActivityEvent) => {
    setEvents((prev) => {
      const updated = [event, ...prev];
      return updated.slice(0, MAX_EVENTS);
    });
  }, []);

  const { isConnected, error, reconnect } = useWebSocket({
    room: 'activity',
    onEvent: handleEvent,
    enabled: true,
  });

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    reconnect();
    // Simulate a brief refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  }, [reconnect]);

  const renderItem = useCallback(
    ({ item }: { item: ActivityEvent }) => (
      <ActivityItem event={item} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: ActivityEvent) => item.id,
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isConnected
                  ? colors.success
                  : colors.error,
              },
            ]}
            testID="connection-status"
          />
          <Text style={styles.statusText}>
            {isConnected ? 'Live' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {events.length === 0 ? (
        <View style={styles.emptyContainer} testID="empty-state">
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Events will appear here in real-time as your team pushes code,
            opens PRs, and deploys.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          testID="activity-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
});
