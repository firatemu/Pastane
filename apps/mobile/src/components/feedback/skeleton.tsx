import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '@/theme';

export function Skeleton({ style, height = 16 }: { style?: StyleProp<ViewStyle>; height?: number }): React.JSX.Element {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { height, opacity }, style]} />;
}

export function ProductGridSkeleton(): React.JSX.Element {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton height={160} style={styles.image} />
          <Skeleton height={14} style={styles.line} />
          <Skeleton height={12} style={[styles.line, { width: '50%' }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceContainer, borderRadius: radii.sm },
  card: { marginBottom: 12, width: '48%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  image: { borderRadius: radii.lg, marginBottom: 8, width: '100%' },
  line: { marginTop: 6, width: '80%' },
});
