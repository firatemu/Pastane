'use client';

import dynamic from 'next/dynamic';
import type { AddressMapPickerClientProps } from './address-map-picker-client';

const AddressMapPickerClient = dynamic(
  () => import('./address-map-picker-client'),
  {
    loading: () => (
      <div className="flex h-[312px] w-full items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-sm text-stone-500">
        Harita yükleniyor…
      </div>
    ),
    ssr: false,
  },
);

/** OpenStreetMap + Leaflet seçici; yalnızca tarayıcıda yüklenir. */
export function AddressMapPicker(props: AddressMapPickerClientProps): React.JSX.Element {
  return <AddressMapPickerClient {...props} />;
}
