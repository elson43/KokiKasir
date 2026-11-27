/**
 * Helper Zona Waktu (WIB / Asia/Jakarta) & Format Tanggal Lokal KokiKasir
 * Mencegah bug 'tanggal nyangkut' akibat penggunaan UTC toISOString().
 */

const WIB_TIMEZONE = 'Asia/Jakarta';
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const SHORT_MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Mengonversi string tanggal (YYYY-MM-DD atau DD-MM-YYYY) ke format standar YYYY-MM-DD.
 *
 * @param {string} dateStr
 * @returns {string} YYYY-MM-DD
 */
export const normalizeDateStr = (dateStr) => {
  if (!dateStr) return getLocalDate();

  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('-');
      return `${y}-${m}-${d}`;
    }
  }

  return getLocalDate(dateStr);
};

/**
 * Mengambil tanggal lokal Indonesia (WIB / Asia/Jakarta) dalam format 'YYYY-MM-DD'.
 *
 * @param {Date|string|number} d
 * @returns {string} YYYY-MM-DD (WIB)
 */
export const getLocalDate = (d = new Date()) => {
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('-');
      return `${year}-${month}-${day}`;
    }
  }

  const date = new Date(d);
  if (isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: WIB_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().split('T')[0];
  }
};

/**
 * Mengambil string jam lokal Indonesia (WIB) dalam format HH.mm / HH:mm.
 *
 * @param {Date|string|number} d
 * @returns {string}
 */
export const getWIBTimeString = (d = new Date()) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('id-ID', {
    timeZone: WIB_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Mengambil tanggal lokal WIB untuk N hari yang lalu (YYYY-MM-DD).
 *
 * @param {number} daysAgo
 * @returns {string} YYYY-MM-DD
 */
export const getDateNDaysAgo = (daysAgo) => {
  const todayStr = getLocalDate();
  const [y, m, d] = todayStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d - daysAgo));
  return target.toISOString().split('T')[0];
};

/**
 * Format string tanggal (YYYY-MM-DD) ke DD-MM-YYYY (contoh: 26-11-2026)
 *
 * @param {string} dateStr
 * @returns {string} DD-MM-YYYY
 */
export const formatDateToDDMMYYYY = (dateStr) => {
  const normalized = normalizeDateStr(dateStr);
  const parts = normalized.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  }
  return normalized;
};

/**
 * Format string tanggal ke format ringkas Indonesia: "26 Nov 2026", "25 Nov 2026"
 *
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDateShortID = (dateStr) => {
  const normalized = normalizeDateStr(dateStr);
  const parts = normalized.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const monthName = SHORT_MONTHS_ID[monthIdx];
    if (monthName && !isNaN(day) && !isNaN(year)) {
      return `${day} ${monthName} ${year}`;
    }
  }
  return formatDateToDDMMYYYY(dateStr);
};

/**
 * Mengecek apakah tanggal sama dengan tanggal lokal hari ini (WIB)
 *
 * @param {string} dateStr YYYY-MM-DD
 * @returns {boolean}
 */
export const isTodayDate = (dateStr) => {
  if (!dateStr) return false;
  return normalizeDateStr(dateStr) === getLocalDate();
};

/**
 * Memeriksa apakah tanggal transaksi berada dalam rentang N hari terakhir waktu lokal WIB
 * (contoh: N = 30 -> hari ini + 29 hari ke belakang = 30 hari penuh)
 *
 * @param {string} dateStr
 * @param {number} days
 * @returns {boolean}
 */
export const isWithinLastNDays = (dateStr, days = 30) => {
  if (!dateStr) return true;

  const todayStr = getLocalDate();
  const normalized = normalizeDateStr(dateStr);
  if (!normalized) return true;
  if (normalized === todayStr) return true;

  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [y, m, d] = normalized.split('-').map(Number);

  const todayUtc = Date.UTC(tY, tM - 1, tD);
  const orderUtc = Date.UTC(y, m - 1, d);
  if (isNaN(orderUtc)) return true;

  const diffDays = Math.round((todayUtc - orderUtc) / (1000 * 60 * 60 * 24));
  return diffDays >= -1 && diffDays <= days - 1;
};

/**
 * Memeriksa apakah tanggal transaksi berada dalam rentang 7 hari terakhir (WIB)
 */
export const isWithinLast7Days = (dateStr) => isWithinLastNDays(dateStr, 7);

/**
 * Memeriksa apakah tanggal transaksi berada dalam rentang 30 hari terakhir (WIB)
 */
export const isWithinLast30Days = (dateStr) => isWithinLastNDays(dateStr, 30);

// Alias kompatibilitas
export const isWithinLast5Days = isWithinLast7Days;

/**
 * Mengurutkan pesanan dari yang terbaru ke terlama berdasarkan tanggal dan waktu bayar/buat.
 *
 * @param {Array} ordersList
 * @returns {Array}
 */
export const sortOrdersNewestFirst = (ordersList) => {
  const todayStr = getLocalDate();
  return [...ordersList].sort((a, b) => {
    const dateA = normalizeDateStr(a.date || todayStr);
    const dateB = normalizeDateStr(b.date || todayStr);
    if (dateA !== dateB) return dateB.localeCompare(dateA);

    if (a.paidTimestamp && b.paidTimestamp && a.paidTimestamp !== b.paidTimestamp) {
      return b.paidTimestamp - a.paidTimestamp;
    }

    const timeA = (a.paidAt || a.createdAt || '').replace(':', '.');
    const timeB = (b.paidAt || b.createdAt || '').replace(':', '.');
    if (timeA !== timeB) return timeB.localeCompare(timeA);

    return (b.id || '').localeCompare(a.id || '');
  });
};

/**
 * Mengelompokkan daftar pesanan berdasarkan tanggal (terbaru ke terlama),
 * dengan format tanggal Indonesia singkat ("26 Nov 2026").
 *
 * @param {Array} ordersList
 * @returns {Array<{rawDate: string, formattedDate: string, orders: Array}>}
 */
export const groupOrdersByDate = (ordersList) => {
  const todayStr = getLocalDate();
  const groups = {};

  ordersList.forEach(order => {
    const rawDate = normalizeDateStr(order.date || todayStr);
    if (!groups[rawDate]) {
      groups[rawDate] = [];
    }
    groups[rawDate].push(order);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  return sortedDates.map(date => ({
    rawDate: date,
    formattedDate: formatDateShortID(date),
    orders: groups[date]
  }));
};
