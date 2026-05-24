/** OpenStreetMap + Leaflet harita seçici; ek native modül gerektirmez (WebView). */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radii, spacing } from '@/theme';

const FALLBACK_LAT = 37.0042;
const FALLBACK_LNG = 35.3314;

function buildMapHtml(latitude: number | null | undefined, longitude: number | null | undefined): string {
  const has =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const lat = has ? latitude! : FALLBACK_LAT;
  const lng = has ? longitude! : FALLBACK_LNG;
  const zoom = has ? 17 : 13;
  const markerLat = has ? latitude! : 'null';
  const markerLng = has ? longitude! : 'null';

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;width:100%;} .leaflet-control-attribution{font-size:9px;}</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', { scrollWheelZoom: true }).setView([${lat}, ${lng}], ${zoom});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  var marker = null;
  function emit(lat, lng) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        latitude: lat,
        longitude: lng,
        mapAddress: 'Seçilen teslim noktası: ' + lat.toFixed(6) + ', ' + lng.toFixed(6)
      }));
    }
  }
  function place(lat, lng) {
    if (marker) { marker.setLatLng([lat, lng]); }
    else {
      marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.on('dragend', function(e) {
        var p = e.target.getLatLng();
        emit(p.lat, p.lng);
      });
    }
    emit(lat, lng);
  }
  map.on('click', function(e) { place(e.latlng.lat, e.latlng.lng); });
  if (${markerLat} !== null && ${markerLng} !== null) { place(${markerLat}, ${markerLng}); }
  setTimeout(function(){ map.invalidateSize(); }, 300);
</script></body></html>`;
}

export type AddressMapCoordinates = {
  latitude: number;
  longitude: number;
  mapAddress: string;
};

export function AddressMapPicker({
  latitude,
  longitude,
  onCoordinatesChange,
}: {
  latitude?: number | null;
  longitude?: number | null;
  onCoordinatesChange: (next: AddressMapCoordinates) => void;
}): React.JSX.Element {
  const html = useMemo(() => buildMapHtml(latitude, longitude), [latitude, longitude]);
  const hasPin =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return (
    <View style={styles.wrap}>
      <WebView
        key={hasPin ? `${latitude}-${longitude}` : 'empty'}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as AddressMapCoordinates;
            if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
              onCoordinatesChange(data);
            }
          } catch {
            /* ignore malformed messages */
          }
        }}
      />
      <Text style={styles.hint}>
        {hasPin
          ? `Enlem ${latitude!.toFixed(6)} · Boylam ${longitude!.toFixed(6)}`
          : 'Haritadan teslim konumunu işaretlemek için dokunun.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    backgroundColor: colors.surfaceLow,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    color: colors.textMuted,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  map: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, height: 280 },
  wrap: { borderColor: colors.outline, borderRadius: radii.lg, borderWidth: 1, marginBottom: spacing.lg, overflow: 'hidden' },
});
