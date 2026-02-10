import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, fontSize, spacing } from '../lib/theme';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = 'Loading...',
}: LoadingScreenProps): React.JSX.Element {
  return (
    <View style={styles.container} testID="loading-screen">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
});
