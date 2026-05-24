import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchNotifications, fetchOrders, markAllNotificationsRead, markNotificationRead } from '@/api/client';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { ProductGridSkeleton } from '@/components/feedback/skeleton';
import { PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { typography } from '@/design-tokens';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { AppNotification } from '@/types';
import { formatDate } from '@/utils/format';
import { colors, radii, shadow, spacing } from '@/theme';

export default function NotificationsScreen(): React.JSX.Element {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (mode: 'full' | 'refresh' = 'full') => {
    if (mode === 'full') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      setItems(await fetchNotifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bildirimler yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ready) void load('full');
    }, [load, ready]),
  );

  async function openNotification(n: AppNotification): Promise<void> {
    if (!n.readAt) {
      try {
        const updated = await markNotificationRead(n.id);
        setItems((prev) => prev.map((item) => (item.id === n.id ? updated : item)));
      } catch {
        /* okundu işaretleme opsiyonel */
      }
    }
    const meta = n.metadata;
    if (meta?.orderId) {
      router.push(`/orders/${meta.orderId}`);
      return;
    }
    if (meta?.orderNumber) {
      try {
        const orders = await fetchOrders();
        const match = orders.find((o) => o.orderNumber === meta.orderNumber);
        if (match) {
          router.push(`/orders/${match.id}`);
          return;
        }
      } catch {
        /* sipariş listesi alınamadı */
      }
    }
    router.push('/(tabs)/orders' as never);
  }

  async function markAll(): Promise<void> {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      await load('refresh');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tümü okundu işaretlenemedi.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <SafeScreen edges={['top']}>
        <ProductGridSkeleton />
      </SafeScreen>
    );
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader title="BİLDİRİMLER" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={() => void load('refresh')} refreshing={refreshing} tintColor={colors.primary} />}
      >
        <View style={styles.pad}>
          <Screen subtitle={unread ? `${unread} okunmamış bildirim` : 'Tüm bildirimler okundu'} title="Bildirimler">
            {loading ? <ProductGridSkeleton /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {unread > 0 ? <SecondaryButton label="Tümünü okundu işaretle" onPress={() => void markAll()} /> : null}
            {!loading && !items.length ? <Text style={styles.empty}>Bildirim yok.</Text> : null}
            {items.map((n) => (
              <Pressable key={n.id} onPress={() => void openNotification(n)} style={[styles.card, !n.readAt && styles.unread]}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.date}>{formatDate(n.createdAt)}</Text>
              </Pressable>
            ))}
            {busy ? <PrimaryButton busy disabled label="Güncelleniyor" onPress={() => undefined} /> : null}
          </Screen>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  card: { ...shadow, backgroundColor: colors.surfaceContainerLowest, borderRadius: radii.xl, marginTop: spacing.md, padding: spacing.lg },
  date: { ...typography.bodyMd, color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  empty: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.lg, textAlign: 'center' },
  error: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, marginBottom: spacing.md },
  pad: { paddingHorizontal: spacing.screenHorizontal },
  scroll: { paddingBottom: 40, paddingTop: spacing.md },
  title: { ...typography.bodyMd, fontFamily: typography.price.fontFamily, fontSize: 15 },
  unread: { borderColor: colors.primary, borderWidth: 1 },
});
