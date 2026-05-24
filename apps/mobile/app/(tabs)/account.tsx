import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { fetchLoyalty, fetchLoyaltyMovements, fetchMyReviews, fetchNotifications, fetchOrders } from '@/api/client';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { OrderRow } from '@/components/orders/order-row';
import { EmptyState, PrimaryButton, SecondaryButton, Screen } from '@/components/ui';
import { typography } from '@/design-tokens';
import { useAuth } from '@/context/auth-context';
import type { LoyaltyAccount, LoyaltyMovement, Order, Review } from '@/types';
import { formatDate, formatTry } from '@/utils/format';
import { loyaltyMovementLabel } from '@/utils/order-status';
import { colors, radii, shadow, spacing } from '@/theme';

export default function AccountScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth, logout } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [movements, setMovements] = useState<LoyaltyMovement[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const [o, l, m, n, r] = await Promise.all([
        fetchOrders(),
        fetchLoyalty(),
        fetchLoyaltyMovements().catch(() => []),
        fetchNotifications().catch(() => []),
        fetchMyReviews().catch(() => []),
      ]);
      setRecentOrders(o.slice(0, 2));
      setLoyalty(l);
      setMovements(m.slice(0, 5));
      setUnreadCount(n.filter((item) => !item.readAt).length);
      setReviews(r.slice(0, 3));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hesap bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!auth) {
    return (
      <SafeScreen edges={['top']}>
        <Screen subtitle="Siparişleriniz, puanlarınız ve bildirimleriniz burada." title="Hesabım">
          <PrimaryButton label="Giriş yap" onPress={() => router.push('/login')} />
          <SecondaryButton label="Kayıt ol" onPress={() => router.push('/register')} />
        </Screen>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader title="HESABIM" />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl onRefresh={load} refreshing={loading} tintColor={colors.primary} />}>
        <View style={styles.pad}>
          <Screen
            subtitle={`${auth.user?.phone ?? '…'}${auth.user?.email ? ` · ${auth.user.email}` : ''}`}
            title={`Merhaba, ${auth.user?.firstName ?? 'hesap'}`}
          >
            <Pressable style={styles.linkCard} onPress={() => router.push('/addresses')}>
              <Text style={styles.linkTitle}>Adreslerim</Text>
              <Text style={styles.linkMeta}>Teslimat adreslerini yönet</Text>
            </Pressable>
            <Pressable style={styles.linkCard} onPress={() => router.push('/profile' as never)}>
              <Text style={styles.linkTitle}>Profil ve şifre</Text>
              <Text style={styles.linkMeta}>Kişisel bilgiler ve güvenlik</Text>
            </Pressable>
            <Pressable style={styles.linkCard} onPress={() => router.push('/notifications' as never)}>
              <Text style={styles.linkTitle}>Bildirimler{unreadCount ? ` · ${unreadCount} yeni` : ''}</Text>
              <Text style={styles.linkMeta}>Sipariş ve kampanya bildirimleri</Text>
            </Pressable>
            <Pressable style={styles.linkCard} onPress={() => router.push('/(tabs)/orders' as never)}>
              <Text style={styles.linkTitle}>Tüm siparişler</Text>
              <Text style={styles.linkMeta}>Sipariş geçmişi ve takip</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Puanlarım</Text>
              <Text style={styles.points}>{loyalty?.points ?? 0} puan</Text>
              {loyalty?.qrCode ? (
                <View style={styles.qrWrap}>
                  <QRCode size={140} value={loyalty.qrCode} />
                  <Text style={styles.qrHint}>Mağazada okutun</Text>
                </View>
              ) : null}
              {movements.map((m) => (
                <View key={m.id} style={styles.movement}>
                  <View style={styles.movementLeft}>
                    <Text style={styles.movementType}>{loyaltyMovementLabel(m.type)}</Text>
                    <Text style={styles.movementDate}>{formatDate(m.createdAt)}</Text>
                  </View>
                  <Text style={styles.movementPts}>
                    {m.points > 0 ? '+' : ''}
                    {m.points}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.section}>Son siparişler</Text>
            {!recentOrders.length && !loading ? <EmptyState message="Henüz siparişiniz yok." /> : null}
            {recentOrders.map((order) => (
              <Pressable key={order.id} onPress={() => router.push(`/orders/${order.id}`)}>
                <OrderRow order={order} />
              </Pressable>
            ))}

            <Text style={styles.section}>Yorumlarım</Text>
            {!reviews.length ? <Text style={styles.muted}>Henüz yorum yok.</Text> : null}
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>
                  {'★'.repeat(r.rating)} · {r.status ?? 'Yorum'}
                </Text>
                {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
                <Text style={styles.reviewDate}>{formatDate(r.createdAt)}</Text>
              </View>
            ))}

            <SecondaryButton label="Çıkış yap" onPress={() => void logout()} />
          </Screen>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error, fontFamily: typography.bodySemi.fontFamily, marginBottom: spacing.md },
  linkCard: { ...shadow, backgroundColor: colors.surfaceContainerLowest, borderRadius: radii.xl, marginBottom: spacing.lg, padding: spacing.lg },
  linkMeta: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  linkTitle: { ...typography.bodyMd, color: colors.primary, fontFamily: typography.price.fontFamily, fontSize: 16 },
  movement: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  movementDate: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 11, marginTop: 2 },
  movementLeft: { flex: 1 },
  movementPts: { ...typography.bodyMd, fontFamily: typography.price.fontFamily },
  movementType: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 13 },
  muted: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.md },
  pad: { paddingHorizontal: spacing.screenHorizontal },
  panel: { ...shadow, backgroundColor: colors.surfaceContainerLowest, borderRadius: radii.xl, marginBottom: spacing.lg, padding: spacing.lg },
  panelTitle: { ...typography.headlineMd, color: colors.primary },
  points: { ...typography.headlineMd, color: colors.secondary, marginTop: spacing.sm },
  qrHint: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 12, marginTop: spacing.sm },
  qrWrap: { alignItems: 'center', marginTop: spacing.lg },
  reviewBody: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  reviewCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, marginBottom: spacing.sm, padding: spacing.md },
  reviewDate: { ...typography.bodyMd, color: colors.muted, fontSize: 11, marginTop: 6 },
  reviewTitle: { ...typography.bodyMd, fontFamily: typography.price.fontFamily },
  scroll: { paddingBottom: 32, paddingTop: spacing.md },
  section: { ...typography.headlineMd, color: colors.primary, marginBottom: spacing.md, marginTop: spacing.lg },
});
