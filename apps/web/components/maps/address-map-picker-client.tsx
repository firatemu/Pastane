'use client';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/** Adana Seyhan civarı başlangıç merkezi */
const FALLBACK_CENTER: [number, number] = [37.0042, 35.3314];

function fixLeafletDefaultIcons(): void {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function MapResize(): React.JSX.Element | null {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const el = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(el);
    const id = window.setTimeout(() => map.invalidateSize(), 400);
    return () => {
      window.clearTimeout(id);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

function PlacementListener({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}): React.JSX.Element | null {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export type AddressMapPickerClientProps = {
  latitude: number | null;
  longitude: number | null;
  onCoordinatesChange: (next: {
    latitude: number;
    longitude: number;
    mapAddress: string;
  }) => void;
};

export default function AddressMapPickerClient({
  latitude,
  longitude,
  onCoordinatesChange,
}: AddressMapPickerClientProps): React.JSX.Element {
  useEffect(() => {
    fixLeafletDefaultIcons();
  }, []);

  const center = useMemo((): [number, number] => {
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      return [latitude, longitude];
    }
    return FALLBACK_CENTER;
  }, [latitude, longitude]);

  const hasMarker =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  function emit(lat: number, lng: number): void {
    onCoordinatesChange({
      latitude: lat,
      longitude: lng,
      mapAddress: `Seçilen teslim noktası: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    });
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-stone-200 shadow-sm [&_.leaflet-control-attribution]:text-[10px]">
      <div className="h-[312px] w-full">
        <MapContainer center={center} zoom={hasMarker ? 17 : 13} scrollWheelZoom className="size-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PlacementListener onPick={emit} />
          <MapResize />
          {hasMarker ? (
            <Marker
              draggable
              eventHandlers={{
                dragend(e) {
                  const p = e.target.getLatLng();
                  emit(p.lat, p.lng);
                },
              }}
              position={[latitude, longitude]}
            />
          ) : null}
        </MapContainer>
      </div>
      <p className="border-t border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-600">
        {hasMarker
          ? `Enlem ${latitude!.toFixed(6)} · Boylam ${longitude!.toFixed(6)}`
          : 'Haritadan teslim konumunu işaretlemek için dokunun.'}
      </p>
    </div>
  );
}
