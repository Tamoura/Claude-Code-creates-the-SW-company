import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth-store';
import { usePushNotifications } from '../hooks/usePushNotifications';
import {
  colors,
  fontSize,
  spacing,
  borderRadius,
} from '../lib/theme';

export function SettingsScreen(): React.JSX.Element {
  const { user, logout } = useAuthStore();
  const { expoPushToken } = usePushNotifications();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState(true);
  const [prAlerts, setPrAlerts] = useState(false);

  const handleLogout = (): void => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>

        {/* Profile section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.avatar} testID="user-avatar">
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName} testID="user-name">
                {user?.name ?? 'Unknown User'}
              </Text>
              <Text style={styles.userEmail} testID="user-email">
                {user?.email ?? 'No email'}
              </Text>
            </View>
          </View>
        </View>

        {/* Notification preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingsList}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                  Push Notifications
                </Text>
                <Text style={styles.settingDescription}>
                  Receive push notifications on this device
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{
                  false: colors.surfaceLight,
                  true: colors.primary + '60',
                }}
                thumbColor={pushEnabled ? colors.primary : colors.textMuted}
                testID="push-toggle"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Risk Alerts</Text>
                <Text style={styles.settingDescription}>
                  Get notified when sprint risk changes
                </Text>
              </View>
              <Switch
                value={riskAlerts}
                onValueChange={setRiskAlerts}
                trackColor={{
                  false: colors.surfaceLight,
                  true: colors.primary + '60',
                }}
                thumbColor={
                  riskAlerts ? colors.primary : colors.textMuted
                }
                testID="risk-alerts-toggle"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                  Anomaly Detection
                </Text>
                <Text style={styles.settingDescription}>
                  Alerts for unusual patterns (coverage drops, stalled PRs)
                </Text>
              </View>
              <Switch
                value={anomalyAlerts}
                onValueChange={setAnomalyAlerts}
                trackColor={{
                  false: colors.surfaceLight,
                  true: colors.primary + '60',
                }}
                thumbColor={
                  anomalyAlerts ? colors.primary : colors.textMuted
                }
                testID="anomaly-alerts-toggle"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>PR Updates</Text>
                <Text style={styles.settingDescription}>
                  Notifications for PR reviews and merges
                </Text>
              </View>
              <Switch
                value={prAlerts}
                onValueChange={setPrAlerts}
                trackColor={{
                  false: colors.surfaceLight,
                  true: colors.primary + '60',
                }}
                thumbColor={
                  prAlerts ? colors.primary : colors.textMuted
                }
                testID="pr-alerts-toggle"
              />
            </View>
          </View>
        </View>

        {/* Device info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device</Text>
          <View style={styles.settingsList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Push Token</Text>
              <Text
                style={styles.infoValue}
                numberOfLines={1}
                testID="push-token"
              >
                {expoPushToken ?? 'Not registered'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          testID="logout-button"
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.primary,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  userEmail: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs / 2,
  },
  settingsList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  settingDescription: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs / 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  infoValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  logoutButton: {
    backgroundColor: colors.error + '15',
    borderWidth: 1,
    borderColor: colors.error + '30',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutText: {
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
