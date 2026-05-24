import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme';
import { fonts } from '@/design-tokens';

export function LoadingOverlay({ visible, message }: { visible: boolean; message?: string }): React.JSX.Element {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <ActivityIndicator color={colors.primary} size="large" />
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(26,28,26,0.45)', flex: 1, justifyContent: 'center' },
  box: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    gap: spacing.md,
    minWidth: 160,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  message: { color: colors.onSurface, fontFamily: fonts.bodySemi, fontSize: 14, textAlign: 'center' },
});
