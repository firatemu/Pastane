import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CartLineItem, CartSummarySticky } from '@/components/cart/cart-line-item';
import { ProductGridSkeleton } from '@/components/feedback/skeleton';
import { AppHeader } from '@/components/layout/app-header';
import { SafeScreen } from '@/components/layout/safe-screen';
import { EmptyState, ErrorBanner, Screen } from '@/components/ui';
import { layout } from '@/design-tokens';
import { useAuth } from '@/context/auth-context';
import { useCart } from '@/context/cart-context';
import { spacing } from '@/theme';

export default function CartScreen(): React.JSX.Element {
  const router = useRouter();
  const { auth } = useAuth();
  const { items, loading, error, clearError, updateQuantity, removeItem } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

  if (loading && !items.length) {
    return (
      <SafeScreen edges={['top']} padded={false}>
        <AppHeader title="SEPET" />
        <View style={styles.skeletonPad}>
          <ProductGridSkeleton />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['top']} padded={false}>
      <AppHeader title="SEPET" />
      <ScrollView contentContainerStyle={[styles.scroll, auth && items.length ? { paddingBottom: layout.stickySummaryBottomOffset + 160 } : undefined]}>
        <View style={styles.pad}>
          <Screen title="Sepetim" subtitle="Seçiminizi gözden geçirin.">
            {error ? <ErrorBanner message={error} onDismiss={clearError} /> : null}
            {actionError ? <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} /> : null}
            {!auth ? (
              <>
                <EmptyState message="Sepetinizi görmek için giriş yapın." actionLabel="Giriş yap" onAction={() => router.push('/login')} />
              </>
            ) : !items.length ? (
              <EmptyState message="Sepetiniz boş." actionLabel="Vitrine git" onAction={() => router.push('/products')} />
            ) : (
              items.map((item) => (
                <CartLineItem
                  key={item.id}
                  busy={busyId === item.id}
                  item={item}
                  onDecrease={() => {
                    setBusyId(item.id);
                    setActionError(null);
                    void updateQuantity(item.id, item.quantity - 1)
                      .catch((e) => setActionError(e instanceof Error ? e.message : 'Güncellenemedi.'))
                      .finally(() => setBusyId(null));
                  }}
                  onIncrease={() => {
                    setBusyId(item.id);
                    setActionError(null);
                    void updateQuantity(item.id, item.quantity + 1)
                      .catch((e) => setActionError(e instanceof Error ? e.message : 'Güncellenemedi.'))
                      .finally(() => setBusyId(null));
                  }}
                  onRemove={() => {
                    setActionError(null);
                    void removeItem(item.id).catch((e) => setActionError(e instanceof Error ? e.message : 'Silinemedi.'));
                  }}
                />
              ))
            )}
          </Screen>
        </View>
      </ScrollView>
      {auth && items.length ? (
        <CartSummarySticky disabled={!items.length} subtotal={subtotal} onCheckout={() => router.push('/checkout')} />
      ) : null}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: spacing.screenHorizontal },
  scroll: { paddingTop: spacing.md },
  skeletonPad: { padding: spacing.screenHorizontal },
});
