import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  getLocalDate,
  getWIBTimeString,
  getDateNDaysAgo,
  normalizeDateStr,
  formatDateToDDMMYYYY,
  formatDateShortID,
  isTodayDate,
  isWithinLast7Days,
  isWithinLast30Days,
  sortOrdersNewestFirst,
  groupOrdersByDate
} from '../utils/dateHelper';
import Logo from '../components/Logo';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Banknote,
  FileSpreadsheet,
  Printer,
  Calendar,
  Award,
  AlertCircle,
  ChevronDown,
  Clock
} from 'lucide-react';

export default function ReportsPage() {
  const { orders, storeSettings } = useApp();
  const todayStr = getLocalDate();
  const start7DaysStr = getDateNDaysAgo(6);
  const start30DaysStr = getDateNDaysAgo(29);

  // Filter State: 'Hari Ini' | '7 Hari' | '30 Hari' | 'Custom' (Default: '30 Hari')
  const [filterMode, setFilterMode] = useState('30 Hari');

  // Custom Date Range State (Default: 30 hari terakhir)
  const [startDate, setStartDate] = useState(start30DaysStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [rangeWarning, setRangeWarning] = useState('');

  // Accordion state per date in Riwayat Lunas
  const [expandedDates, setExpandedDates] = useState({});

  const toggleDateAccordion = (rawDate, defaultExpanded) => {
    setExpandedDates(prev => {
      const current = prev[rawDate] ?? defaultExpanded;
      return {
        ...prev,
        [rawDate]: !current
      };
    });
  };

  // Validasi & Update Tanggal Mulai (Custom Range)
  const handleStartDateChange = (val) => {
    setStartDate(val);
    setRangeWarning('');

    if (val && endDate && val > endDate) {
      setEndDate(val);
    }
  };

  // Validasi & Update Tanggal Akhir (Custom Range)
  const handleEndDateChange = (val) => {
    setRangeWarning('');

    if (startDate && val && val < startDate) {
      setRangeWarning('Tanggal akhir tidak boleh lebih awal dari tanggal mulai.');
      setEndDate(startDate);
      return;
    }

    setEndDate(val);
  };

  // Extract PAID orders only
  const allPaidOrders = useMemo(
    () => orders.filter(o => o.status === 'PAID'),
    [orders]
  );

  // Filter & sort PAID orders based on active filterMode (newest to oldest)
  const filteredPaidOrders = useMemo(() => {
    const filtered = allPaidOrders.filter(o => {
      const orderDate = normalizeDateStr(o.date || todayStr);
      if (filterMode === 'Hari Ini') {
        return orderDate === todayStr;
      }
      if (filterMode === '7 Hari') {
        return isWithinLast7Days(orderDate);
      }
      if (filterMode === '30 Hari') {
        return isWithinLast30Days(orderDate);
      }
      if (filterMode === 'Custom') {
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
        return true;
      }
      return true;
    });

    return sortOrdersNewestFirst(filtered);
  }, [allPaidOrders, filterMode, startDate, endDate, todayStr]);

  // Group filtered PAID orders by date ("26 Nov 2026", "25 Nov 2026", ...)
  const paidDateGroups = useMemo(
    () => groupOrdersByDate(filteredPaidOrders),
    [filteredPaidOrders]
  );

  const areAllExpanded = paidDateGroups.length > 0 && paidDateGroups.every((g, idx) => expandedDates[g.rawDate] ?? (idx === 0));

  const handleToggleAllDates = () => {
    const nextState = !areAllExpanded;
    const updated = {};
    paidDateGroups.forEach(g => {
      updated[g.rawDate] = nextState;
    });
    setExpandedDates(updated);
  };

  // Compute 3 Key Indicators & Counts: TOTAL OMSET, TOTAL QRIS, TOTAL TUNAI
  const totalOmset = filteredPaidOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const qrisOrders = filteredPaidOrders.filter(o => o.paymentMethod === 'QRIS');
  const tunaiOrders = filteredPaidOrders.filter(o => o.paymentMethod === 'TUNAI' || !o.paymentMethod);
  const totalQRIS = qrisOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalTunai = tunaiOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);

  // Compute Bestseller Item Sold list
  const itemCounts = {};
  filteredPaidOrders.forEach(o => {
    o.items?.forEach(it => {
      if (!itemCounts[it.name]) {
        itemCounts[it.name] = { name: it.name, quantity: 0, revenue: 0 };
      }
      itemCounts[it.name].quantity += it.quantity;
      itemCounts[it.name].revenue += it.subtotal;
    });
  });

  const bestsellerList = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity);

  // Export Laporan ke Excel Profesional (.xlsx) sesuai filter aktif
  const handleExportExcel = () => {
    if (filteredPaidOrders.length === 0) {
      alert('Belum ada transaksi berstatus PAID pada filter ini untuk diekspor!');
      return;
    }

    // 1. Data Sheet Transaksi
    const dataRows = filteredPaidOrders.map((o, idx) => {
      const itemsDetail = o.items.map(it => {
        let str = `${it.quantity}x ${it.name}`;
        if (it.notes) str += ` (${it.notes})`;
        return str;
      }).join('; ');

      return {
        'No': idx + 1,
        'ID Pesanan': o.id,
        'Tanggal': formatDateToDDMMYYYY(o.date || todayStr),
        'Jam': o.paidAt || o.createdAt,
        'Nama Pelanggan': o.customerName,
        'Tipe Pesanan': o.orderType,
        'Metode Bayar': o.paymentMethod || 'TUNAI',
        'Detail Menu': itemsDetail,
        'Grand Total (Rp)': o.total
      };
    });

    // Baris total di akhir
    dataRows.push({
      'No': '',
      'ID Pesanan': '',
      'Tanggal': '',
      'Jam': '',
      'Nama Pelanggan': '',
      'Tipe Pesanan': '',
      'Metode Bayar': 'TOTAL OMSET',
      'Detail Menu': `${filteredPaidOrders.length} Transaksi (Tunai: Rp ${totalTunai.toLocaleString('id-ID')} | QRIS: Rp ${totalQRIS.toLocaleString('id-ID')})`,
      'Grand Total (Rp)': totalOmset
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    // Atur Lebar Kolom (Widths) agar Rapi & Profesional
    worksheet['!cols'] = [
      { wch: 6 },   // No
      { wch: 14 },  // ID Pesanan
      { wch: 14 },  // Tanggal
      { wch: 10 },  // Jam
      { wch: 22 },  // Pelanggan
      { wch: 14 },  // Tipe
      { wch: 14 },  // Metode
      { wch: 45 },  // Detail Menu
      { wch: 18 }   // Grand Total
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');

    // 2. Data Sheet Bestseller
    const bestsellerRows = bestsellerList.map((b, idx) => ({
      'Peringkat': idx + 1,
      'Nama Menu': b.name,
      'Porsi Terjual': b.quantity,
      'Total Omset (Rp)': b.revenue
    }));

    if (bestsellerRows.length > 0) {
      const wsBestseller = XLSX.utils.json_to_sheet(bestsellerRows);
      wsBestseller['!cols'] = [
        { wch: 10 },
        { wch: 30 },
        { wch: 15 },
        { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(workbook, wsBestseller, 'Item Terjual (Bestseller)');
    }

    const safeStorePrefix = storeSettings?.name ? storeSettings.name.replace(/[^a-zA-Z0-9]/g, '_') : 'KokiKasir';
    let filenameLabel = `Custom_${startDate}_sd_${endDate}`;
    if (filterMode === 'Hari Ini') {
      filenameLabel = `HariIni_${todayStr}`;
    } else if (filterMode === '7 Hari') {
      filenameLabel = `7Hari_${start7DaysStr}_sd_${todayStr}`;
    } else if (filterMode === '30 Hari') {
      filenameLabel = `30Hari_${start30DaysStr}_sd_${todayStr}`;
    }

    XLSX.writeFile(workbook, `${safeStorePrefix}_Laporan_${filenameLabel}.xlsx`);
  };

  // Cetak Laporan (Print)
  const handlePrintReport = () => {
    window.print();
  };

  const activePeriodLabel = useMemo(() => {
    if (filterMode === 'Hari Ini') {
      return `Hari Ini (${formatDateShortID(todayStr)})`;
    }
    if (filterMode === '7 Hari') {
      return `7 Hari Terakhir (${formatDateShortID(start7DaysStr)} - ${formatDateShortID(todayStr)})`;
    }
    if (filterMode === '30 Hari') {
      return `30 Hari Terakhir (${formatDateShortID(start30DaysStr)} - ${formatDateShortID(todayStr)})`;
    }
    return `${formatDateShortID(startDate)} s/d ${formatDateShortID(endDate)}`;
  }, [filterMode, todayStr, start7DaysStr, start30DaysStr, startDate, endDate]);

  return (
    <div className="space-y-6 pb-20 lg:pb-10">
      {/* =========================================================================
          AREA KHUSUS CETAK (PRINT-READY LAYOUT - HANYA MUNCUL DI PRINTER / PDF)
         ========================================================================= */}
      <div className="hidden print:block font-sans text-black p-4 space-y-6">
        {/* Print Header dengan Logo & Info Dokumen */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-stone-800">
          <div className="flex items-center gap-3">
            {storeSettings?.logo ? (
              <img
                src={storeSettings.logo}
                alt="Logo Toko"
                className="w-12 h-12 rounded-xl object-contain border border-stone-300 p-0.5 bg-white"
              />
            ) : (
              <Logo size="md" showText={false} />
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900">
                {storeSettings?.name || (
                  <>Koki<span className="text-emerald-700">Kasir</span></>
                )}
              </h1>
              <p className="text-xs text-stone-600 font-semibold">
                {storeSettings?.bio || 'Laporan Penjualan & Pembukuan Kasir (Official Printout)'}
              </p>
              {(storeSettings?.phone || storeSettings?.hours) && (
                <p className="text-[10px] text-stone-500 font-medium">
                  {storeSettings.phone && `Telp: ${storeSettings.phone}`}
                  {storeSettings.phone && storeSettings.hours && ' • '}
                  {storeSettings.hours && `Jam Operasional: ${storeSettings.hours}`}
                </p>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-stone-600 space-y-0.5">
            <div><strong>Periode:</strong> {activePeriodLabel}</div>
            <div><strong>Dicetak:</strong> {formatDateShortID(todayStr)} {getWIBTimeString(new Date())} WIB</div>
            <div><strong>Total Transaksi:</strong> {filteredPaidOrders.length} Pesanan Lunas</div>
          </div>
        </div>

        {/* Ringkasan Omset Cetak */}
        <div className="grid grid-cols-3 gap-4 border border-stone-300 rounded-xl p-4 bg-stone-50">
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase">Total Omset Penjualan</div>
            <div className="text-xl font-black text-stone-900">
              Rp {totalOmset.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-stone-500">{filteredPaidOrders.length} Transaksi</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase">Total Pembayaran QRIS</div>
            <div className="text-xl font-black text-stone-900">
              Rp {totalQRIS.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-stone-500">{qrisOrders.length} Transaksi</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase">Total Pembayaran Tunai</div>
            <div className="text-xl font-black text-stone-900">
              Rp {totalTunai.toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-stone-500">{tunaiOrders.length} Transaksi</div>
          </div>
        </div>

        {/* Tabel Transaksi Cetak */}
        <div className="space-y-2">
          <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide">
            1. Rincian Riwayat Transaksi (PAID)
          </h3>
          <table className="w-full text-left text-xs border border-stone-300 border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-300 text-stone-900 font-bold">
                <th className="p-2 border-r border-stone-300 w-10">No</th>
                <th className="p-2 border-r border-stone-300 w-28">Waktu</th>
                <th className="p-2 border-r border-stone-300">Pelanggan</th>
                <th className="p-2 border-r border-stone-300 w-24">Tipe</th>
                <th className="p-2 border-r border-stone-300 w-20">Metode</th>
                <th className="p-2 border-r border-stone-300">Menu Dipesan</th>
                <th className="p-2 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredPaidOrders.map((o, idx) => (
                <tr key={o.id} className="border-b border-stone-200">
                  <td className="p-2 border-r border-stone-300 text-center">{idx + 1}</td>
                  <td className="p-2 border-r border-stone-300">
                    {formatDateShortID(o.date || todayStr)}<br/>
                    <span className="text-[10px] text-stone-500">{o.paidAt || o.createdAt} WIB</span>
                  </td>
                  <td className="p-2 border-r border-stone-300 font-bold">{o.customerName}</td>
                  <td className="p-2 border-r border-stone-300">{o.orderType}</td>
                  <td className="p-2 border-r border-stone-300 font-semibold">{o.paymentMethod || 'TUNAI'}</td>
                  <td className="p-2 border-r border-stone-300 text-[11px]">
                    {o.items.map(it => `${it.quantity}x ${it.name}${it.notes ? ` (${it.notes})` : ''}`).join(', ')}
                  </td>
                  <td className="p-2 text-right font-black">
                    Rp {o.total.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-stone-100 border-t-2 border-stone-800 font-black">
                <td colSpan={6} className="p-2 text-right uppercase">Total Seluruh Omset:</td>
                <td className="p-2 text-right text-stone-950">
                  Rp {totalOmset.toLocaleString('id-ID')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Tabel Bestseller Cetak */}
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide">
            2. Rekapitulasi Item Terjual (Acuan Belanja Bahan Koki)
          </h3>
          <table className="w-full text-left text-xs border border-stone-300 border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-300 text-stone-900 font-bold">
                <th className="p-2 border-r border-stone-300 w-12 text-center">Peringkat</th>
                <th className="p-2 border-r border-stone-300">Nama Menu</th>
                <th className="p-2 border-r border-stone-300 w-28 text-center">Porsi Terjual</th>
                <th className="p-2 text-right w-36">Total Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {bestsellerList.map((item, index) => (
                <tr key={index} className="border-b border-stone-200">
                  <td className="p-2 border-r border-stone-300 text-center font-bold">{index + 1}</td>
                  <td className="p-2 border-r border-stone-300 font-semibold">{item.name}</td>
                  <td className="p-2 border-r border-stone-300 text-center font-black">{item.quantity} Porsi</td>
                  <td className="p-2 text-right font-bold">Rp {item.revenue.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan Cetak */}
        <div className="pt-10 flex justify-between text-xs text-stone-700">
          <div>
            <div>Keterangan: Dokumen ini dicetak otomatis dari sistem KokiKasir.</div>
            <div className="text-[10px] text-stone-500 mt-1">Status Data: Terverifikasi Lunas (PAID)</div>
          </div>
          <div className="text-center w-48">
            <div>Dibuat oleh:</div>
            <div className="h-16"></div>
            <div className="border-t border-stone-500 font-bold text-stone-900">
              Kasir / Koki Bertugas
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          AREA INTERAKTIF WEB (DISEMBUNYIKAN SAAT CETAK print:hidden)
         ========================================================================= */}
      <div className="space-y-6 print:hidden">
        {/* Warning jika input rentang Custom tidak valid */}
        {rangeWarning && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{rangeWarning}</span>
          </div>
        )}

        {/* Date Filter & Action Header (Hari Ini / 7 Hari / 30 Hari / Custom + Export Excel + Cetak) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-100/50">
          {/* Filter Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="flex flex-wrap bg-emerald-50 p-1 rounded-2xl border border-emerald-100 gap-1">
                {['Hari Ini', '7 Hari', '30 Hari', 'Custom'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setFilterMode(mode);
                      setRangeWarning('');
                    }}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      filterMode === mode
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-emerald-900/70 hover:bg-white/60'
                    }`}
                  >
                    {mode === '30 Hari' ? '30 Hari' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Date Range jika Mode 'Custom' dipilih */}
            {filterMode === 'Custom' && (
              <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded-2xl border border-stone-200 text-xs animate-fade-in">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-emerald-950 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <span className="text-stone-400 font-semibold">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-white border border-stone-200 text-emerald-950 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            )}
          </div>

          {/* Action Buttons: Export Excel & Cetak Laporan */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Cetak Laporan (Print-Ready) */}
            <button
              type="button"
              onClick={handlePrintReport}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Cetak Laporan</span>
            </button>

            {/* Export Excel (.xlsx) Profesional */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-emerald-600/25"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* 3 Indikator Kartu Utama: TOTAL OMSET, TOTAL QRIS, TOTAL TUNAI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Omset */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm shadow-emerald-100/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Total Omset ({filterMode})
              </span>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                Rp {totalOmset.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">
                {filteredPaidOrders.length} Transaksi Berhasil
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Total QRIS */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm shadow-emerald-100/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                Total QRIS
              </span>
              <div className="text-2xl font-black text-teal-950 mt-1">
                Rp {totalQRIS.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] text-teal-600 font-medium">
                {qrisOrders.length} Transaksi • Digital Payment
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          {/* Total Tunai */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm shadow-emerald-100/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Total Tunai
              </span>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                Rp {totalTunai.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">
                {tunaiOrders.length} Transaksi • Uang Kas Laci
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Grid: Riwayat Lunas (Grouped by Date) & Laporan Bestseller */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Riwayat Lunas (Grouped by Date, Accordion) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm shadow-emerald-100/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  <span>Riwayat Lunas (PAID)</span>
                </h4>
                <span className="text-[11px] text-stone-500 font-medium">
                  Periode: <strong>{activePeriodLabel}</strong>
                </span>
              </div>

              {paidDateGroups.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleAllDates}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200/70 transition-colors"
                >
                  {areAllExpanded ? 'Tutup Semua Tanggal' : 'Buka Semua Tanggal'}
                </button>
              )}
            </div>

            {paidDateGroups.length === 0 ? (
              <div className="text-center py-12 text-xs text-stone-500 border border-dashed border-emerald-100 rounded-2xl">
                Belum ada riwayat transaksi lunas pada rentang waktu ini.
              </div>
            ) : (
              <div className="max-h-[34rem] overflow-y-auto pr-1 space-y-3">
                {paidDateGroups.map((group, idx) => {
                  const isExpanded = expandedDates[group.rawDate] ?? (idx === 0);
                  const groupRevenue = group.orders.reduce((sum, o) => sum + (o.total || 0), 0);

                  return (
                    <div
                      key={group.rawDate}
                      className="rounded-2xl border border-emerald-100/90 bg-emerald-50/20 overflow-hidden transition-all"
                    >
                      {/* Date Group Header */}
                      <div
                        onClick={() => toggleDateAccordion(group.rawDate, idx === 0)}
                        className="flex items-center justify-between p-3.5 bg-white hover:bg-emerald-50/50 cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            isExpanded ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-emerald-950">
                                {group.formattedDate}
                              </span>
                              {isTodayDate(group.rawDate) && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                  Hari Ini
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 font-medium">
                              {group.orders.length} Transaksi • <strong className="text-emerald-700">Rp {groupRevenue.toLocaleString('id-ID')}</strong>
                            </div>
                          </div>
                        </div>

                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${
                          isExpanded ? 'bg-emerald-100 text-emerald-800 rotate-180' : 'bg-stone-100 text-stone-600'
                        }`}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Expanded Transactions List for Date */}
                      {isExpanded && (
                        <div className="p-3 pt-2 border-t border-emerald-100/80 space-y-2 max-h-80 overflow-y-auto">
                          {group.orders.map(order => (
                            <div
                              key={order.id}
                              className="p-3 rounded-xl bg-white border border-emerald-100/70 hover:border-emerald-200 flex items-center justify-between gap-3 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-xs sm:text-sm text-emerald-950 truncate">
                                    {order.customerName}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                    order.orderType === 'Pesan Dulu'
                                      ? 'bg-teal-100 text-teal-800'
                                      : order.orderType === 'Bungkus'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {order.orderType}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                                    order.paymentMethod === 'QRIS'
                                      ? 'bg-teal-100 text-teal-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {order.paymentMethod || 'TUNAI'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
                                  <Clock className="w-3 h-3 flex-shrink-0" />
                                  <span>{order.paidAt || order.createdAt} WIB</span>
                                  <span>•</span>
                                  <span className="truncate">
                                    {order.items?.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <div className="font-extrabold text-xs sm:text-sm text-emerald-700">
                                  Rp {order.total.toLocaleString('id-ID')}
                                </div>
                                <div className="text-[10px] text-stone-400 font-medium">
                                  {order.id}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Laporan Bestseller (Item Terjual untuk acuan belanja koki) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm shadow-emerald-100/50">
            <h4 className="font-extrabold text-emerald-950 text-base mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Laporan Bestseller (Item Terjual)</span>
            </h4>
            <p className="text-[11px] text-stone-500 mb-4">
              Acuan belanja bahan baku koki berdasarkan filter ({filterMode}).
            </p>

            {bestsellerList.length === 0 ? (
              <div className="text-center py-10 text-xs text-stone-500">
                Belum ada item terjual pada rentang waktu ini.
              </div>
            ) : (
              <div className="space-y-3 max-h-[30rem] overflow-y-auto pr-1">
                {bestsellerList.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        index === 0 ? 'bg-amber-400 text-white' : 'bg-emerald-200 text-emerald-800'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-emerald-950">{item.name}</div>
                        <div className="text-[10px] text-stone-500">
                          Pendapatan: Rp {item.revenue.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-extrabold text-xs">
                        {item.quantity} Porsi
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
