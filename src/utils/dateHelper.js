/**
 * Helper Zona Waktu & Format Tanggal Lokal KokiKasir
 * Mencegah bug 'tanggal nyangkut' akibat penggunaan UTC toISOString().
 */

/**
 * Mengambil tanggal lokal dalam format 'YYYY-MM-DD'
 * berdasarkan offset zona waktu lokal pengguna.
 * 
 * @param {Date|string|number} d 
 * @returns {string} YYYY-MM-DD (waktu lokal)
 */
export const getLocalDate = (d = new Date()) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

/**
 * Format string tanggal (YYYY-MM-DD) ke DD-MM-YYYY (contoh: 23-11-2026)
 * 
 * @param {string} dateStr 
 * @returns {string} DD-MM-YYYY
 */
export const formatDateToDDMMYYYY = (dateStr) => {
  if (!dateStr) {
    return formatDateToDDMMYYYY(getLocalDate());
  }

  // Jika format sudah DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;

  // Jika format YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }

  // Fallback parsing objek Date
  const dObj = new Date(dateStr);
  if (!isNaN(dObj.getTime())) {
    const local = getLocalDate(dObj);
    const [y, m, d] = local.split('-');
    return `${d}-${m}-${y}`;
  }

  return dateStr;
};

/**
 * Mengecek apakah tanggal sama dengan tanggal lokal hari ini
 * 
 * @param {string} dateStr YYYY-MM-DD
 * @returns {boolean}
 */
export const isTodayDate = (dateStr) => {
  if (!dateStr) return false;
  return dateStr === getLocalDate();
};

/**
 * Batas Maksimal 7 Hari (Khusus Tab Riwayat Lunas Dashboard)
 * Memeriksa apakah tanggal transaksi masih berada dalam rentang 7 hari terakhir waktu lokal
 * 
 * @param {string} dateStr 
 * @returns {boolean}
 */
export const isWithinLast7Days = (dateStr) => {
  if (!dateStr) return true;

  const todayStr = getLocalDate();
  if (dateStr === todayStr) return true;

  // Ubah ke Date objek dengan waktu 00:00:00 lokal
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const todayLocal = new Date(tY, tM - 1, tD);

  let orderDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    orderDate = new Date(y, m - 1, d);
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-').map(Number);
    orderDate = new Date(y, m - 1, d);
  } else {
    orderDate = new Date(dateStr);
  }

  if (isNaN(orderDate.getTime())) return true;

  // Selisih hari (todayLocal - orderDate dalam milidetik)
  const diffTime = todayLocal.getTime() - orderDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Menampilkan hari ini (0) sampai 6 hari ke belakang (total 7 hari)
  return diffDays >= -1 && diffDays <= 6;
};

// Alias untuk kompatibilitas jika ada yang memanggil fungsi 5 hari
export const isWithinLast5Days = isWithinLast7Days;
