import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  cancelOrder,
  fetchLoyalty,
  fetchLoyaltyMovements,
  fetchNotifications,
  fetchOrders,
} from '@/api/client';
import { EmptyState, PrimaryButton, SecondaryButton, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import type { LoyaltyAccount, LoyaltyMovement, AppNotification, Order } from '@/types';
import { formatDate, formatTry } from '@/utils/format';
import { loyaltyMovementLabel, statusLabel, CANCELLABLE_STATUSES } from '@/utils/order-status';
import { colors, radii, shadow, spacing } from '@/theme';

export default function AccountScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [movements, setMovements] = useState<LoyaltyMovement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const [o, l, m, n] = await Promise.all([
        fetchOrders(),
        fetchLoyalty(),
        fetchLoyaltyMovements().catch(() => []),
        fetchNotifications().catch(() => []),
      ]);
      setOrders(o);
      setLoyalty(l);
      setMovements(m.slice(0, 5));
      setNotifications(n.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!auth) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.pad}>
          <Screen title="Hesabım" subtitle="Siparişleriniz, puanlarınız ve bildirimleriniz burada.">
            <PrimaryButton label="Giriş yap" onPress={() => router.push('/login')} />
            <SecondaryButton label="Kayıt ol" onPress={() => router.push('/register')} />
          </Screen>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Screen title={`Merhaba, ${auth.user.firstName}`} subtitle={`${auth.user.phone}${auth.user.email ? ` · ${auth.user.email}` : ''}`}>
          <Pressable style={styles.linkCard} onPress={() => router.push('/addresses')}>
            <Text style={styles.linkTitle}>Adreslerim</Text>
            <Text style={styles.linkMeta}>Teslimat adreslerini yönet</Text>
          </Pressable>
          <Pressable style={styles.linkCard} onPress={() => router.push('/profile' as never)}>
            <Text style={styles.linkTitle}>Profil bilgilerim</Text>
            <Text style={styles.linkMeta}>Ad, soyad ve e-posta bilgilerini güncelle</Text>
          </Pressable>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Puanlarım</Text>
            <Text style={styles.points}>{loyalty?.points ?? 0} puan</Text>
            {loyalty?.qrCode ? (
              <View style={styles.qrWrap}>
                <QRCode value={loyalty.qrCode} size={140} />
                <Text style={styles.qrHint}>Mağazada okutun</Text>
              </View>
            ) : null}
            {movements.map((m) => (
              <View key={m.id} style={styles.movement}>
                <Text style={styles.movementType}>{loyaltyMovementLabel(m.type)}</Text>
                <Text style={styles.movementPts}>{m.points > 0 ? '+' : ''}{m.points}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Siparişler</Text>
          {loading && !orders.length ? <Text style={styles.muted}>Yükleniyor…</Text> : null}
          {!orders.length && !loading ? <EmptyState message="Henüz siparişiniz yok." /> : null}
          {orders.map((order) => (
            <Pressable key={order.id} style={styles.orderCard} onPress={() => router.push(`/orders/${order.id}`)}>
              <View style={styles.orderHead}>
                <Text style={styles.orderNo}>{order.orderNumber}</Text>
                <Text style={styles.orderStatus}>{statusLabel(order.status)}</Text>
              </View>
              <Text style={styles.orderMeta}>{formatDate(order.createdAt)} · {formatTry(order.grandTotal)}</Text>
              {CANCELLABLE_STATUSES.has(order.status) ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    void cancelOrder(order.id).then(() => load());
                  }}
                >
                  <Text style={styles.cancel}>İptal et</Text>
                </Pressable>
              ) : null}
            </Pressable>
          ))}

          <Text style={styles.section}>Bildirimler</Text>
          {!notifications.length ? <Text style={styles.muted}>Bildirim yok.</Text> : null}
          {notifications.map((n) => (
            <View key={n.id} style={styles.notif}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifBody}>{n.body}</Text>
            </View>
          ))}

          <SecondaryButton label="Çıkış yap" onPress={() => void logout()} />
        </Screen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cancel: { color: colors.error, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginTop: 8 },
  linkCard: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, marginBottom: spacing.lg, padding: spacing.lg },
  linkMeta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 4 },
  linkTitle: { color: colors.chocolate, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  movement: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  movementPts: { fontFamily: 'PlusJakartaSans_700Bold' },
  movementType: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13 },
  muted: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', marginBottom: spacing.md },
  notif: { backgroundColor: colors.surfaceLow, borderRadius: radii.lg, marginBottom: spacing.sm, padding: spacing.md },
  notifBody: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 4 },
  notifTitle: { fontFamily: 'PlusJakartaSans_700Bold' },
  orderCard: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, marginBottom: spacing.md, padding: spacing.lg },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between' },
  orderMeta: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 6 },
  orderNo: { fontFamily: 'PlusJakartaSans_700Bold' },
  orderStatus: { color: colors.accent, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 },
  pad: { flex: 1, padding: spacing.xl },
  panel: { ...shadow, backgroundColor: colors.surface, borderRadius: radii.xl, marginBottom: spacing.lg, padding: spacing.lg },
  panelTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20 },
  points: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, marginTop: spacing.sm },
  qrHint: { color: colors.textMuted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, marginTop: spacing.sm },
  qrWrap: { alignItems: 'center', marginTop: spacing.lg },
  safe: { backgroundColor: colors.background, flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: 32 },
  section: { color: colors.primary, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, marginBottom: spacing.md, marginTop: spacing.lg },
});
