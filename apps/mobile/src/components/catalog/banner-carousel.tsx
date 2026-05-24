import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { typography } from '@/design-tokens';
import type { HomeBanner } from '@/types';
import { colors, radii, spacing } from '@/theme';

export function BannerCarousel({
  banners,
  fallbackTitle,
  onPressCta,
}: {
  banners: HomeBanner[];
  fallbackTitle?: string;
  onPressCta?: () => void;
}): React.JSX.Element | null {
  const items = banners.filter((item) => item.mobileMediaUrl || item.desktopMediaUrl);
  if (!items.length) return null;

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
      {items.map((b) => {
        const uri = b.mobileMediaUrl ?? b.desktopMediaUrl;
        if (!uri) return null;
        return (
          <ImageBackground key={b.id} imageStyle={styles.heroImg} source={{ uri }} style={styles.hero}>
            <View style={styles.overlay} />
            <View style={styles.content}>
              {b.subtitle ? <Text style={styles.eyebrow}>{b.subtitle}</Text> : null}
              <Text style={styles.title}>{b.title ?? fallbackTitle ?? ''}</Text>
              {onPressCta ? (
                <Pressable onPress={onPressCta} style={styles.cta}>
                  <Text style={styles.ctaText}>Keşfet</Text>
                </Pressable>
              ) : null}
            </View>
          </ImageBackground>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  carousel: { marginBottom: spacing.md },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  cta: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radii.pill, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  ctaText: { ...typography.labelSm, color: colors.onPrimary },
  eyebrow: { ...typography.labelSm, color: 'rgba(255,255,255,0.9)' },
  hero: { borderRadius: radii.xl, height: 160, marginRight: spacing.md, overflow: 'hidden', width: 320 },
  heroImg: { borderRadius: radii.xl },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.32)' },
  title: { ...typography.headlineSm, color: '#fff', marginTop: 4 },
});
