import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Status QRIS toko:
 *  - sedang dibaca
 *  - QRIS Dinamis aktif (badge hijau + nama merchant)
 *  - foto tersimpan sebagai QRIS statis (catatan amber)
 */
export default function QrisStatusBadge({ className = '' }) {
  const { storeSettings, qrisImage, qrisDecoding } = useApp();

  if (qrisDecoding) {
    return (
      <p className={`text-[11px] font-semibold text-stone-500 animate-pulse ${className}`}>
        Membaca QRIS...
      </p>
    );
  }

  if (storeSettings?.qrisPayload) {
    const merchant = [storeSettings.qrisMerchantName, storeSettings.qrisMerchantCity]
      .filter(Boolean)
      .join(' • ');

    return (
      <div className={`p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-left ${className}`}>
        <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>QRIS Dinamis Aktif</span>
        </div>
        {merchant && (
          <div className="text-xs font-bold text-emerald-950 mt-1 break-words">{merchant}</div>
        )}
        <p className="text-[11px] text-emerald-700/90 mt-0.5">
          Nominal pesanan akan terisi otomatis saat pembeli scan.
        </p>
      </div>
    );
  }

  if (qrisImage) {
    return (
      <div className={`p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-2 ${className}`}>
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold text-amber-900 leading-relaxed">
          Foto QRIS tersimpan sebagai QRIS statis. Unggah foto QRIS yang lebih jelas agar nominal terisi otomatis.
        </p>
      </div>
    );
  }

  return null;
}
