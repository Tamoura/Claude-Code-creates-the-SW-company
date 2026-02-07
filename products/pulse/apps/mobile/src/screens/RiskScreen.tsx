import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { RiskGauge } from '../components/RiskGauge';
import { FactorBar } from '../components/FactorBar';
import { getRiskCurrent } from '../lib/api-client';
import { colors, fontSize, spacing, borderRadius } from '../lib/theme';

// Fallback team ID for development
const DEFAULT_TEAM_ID = 'team-1';

export function RiskScreen(): React.JSX.Element {
  const {
    data: risk,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['risk', 'current', DEFAULT_TEAM_ID],
    queryFn: () => getRiskCurrent(DEFAULT_TEAM_ID),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer} testID="risk-loading">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            Calculating sprint risk...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !risk) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer} testID="risk-error">
          <Text style={styles.errorTitle}>Unable to load risk data</Text>
          <Text style={styles.errorMessage}>
            {error instanceof Error
              ? error.message
              : 'Please check your connection and try again.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.title}>Sprint Risk</Text>

        <View style={styles.gaugeContainer} testID="risk-gauge-container">
          <RiskGauge
            score={risk.score}
            level={risk.level}
          />
        </View>

        <View style={styles.explanationCard} testID="risk-explanation">
          <Text style={styles.explanationLabel}>AI Analysis</Text>
          <Text style={styles.explanationText}>
            {risk.explanation}
          </Text>
          <Text style={styles.calculatedAt}>
            Last calculated:{' '}
            {new Date(risk.calculatedAt).toLocaleString()}
          </Text>
        </View>

        {risk.factors.length > 0 ? (
          <View style={styles.factorsSection} testID="risk-factors">
            <Text style={styles.sectionTitle}>Risk Factors</Text>
            {risk.factors.map((factor) => (
              <FactorBar
                key={factor.name}
                name={factor.name}
                score={factor.score}
                detail={factor.detail}
              />
            ))}
          </View>
        ) : null}
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
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  explanationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  explanationLabel: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  explanationText: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  calculatedAt: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  factorsSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
});
