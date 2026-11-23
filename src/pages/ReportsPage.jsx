import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  getLocalDate, 
  formatDateToDDMMYYYY 
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
  AlertCircle
} from 'lucide-react';

export default function ReportsPage() {
  const { orders, storeSettings } = useApp();
  const todayStr = getLocalDate();

  // Filter State: 'Hari Ini' | 'Custom'
  const [filterMode, setFilterMode] = useState('Hari Ini');

  // Custom Date Range State (Default: 6 hari lalu sampai hari ini = rentang 7 hari)
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return getLocalDate(d);
  }, []);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(todayStr);
  const [rangeWarning, setRangeWarning] = useState('');

  // Validasi & Update Tanggal Mulai (Max 7 Hari)
  const handleStartDateChange = (val) => {
    setStartDate(val);
    setRangeWarning('');

    if (val && endDate) {
      const s = new Date(val);
      const e = new Date(endDate);
      const diffDays = Math.floor((e - s) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        setEndDate(val);
      } else if (diffDays > 6) {
        // Otomatis batasi endDate ke startDate + 6 hari (maksimal 7 hari)
        const maxEnd = new Date(s);
        maxEnd.setDate(maxEnd.getDate() + 6);
        const maxEndStr = getLocalDate(maxEnd);
        setEndDate(maxEndStr);
        setRangeWarning('Rentang tanggal dibatasi maksimal 7 hari.');
      }
    }
  };

  // Validasi & Update Tanggal Akhir (Max 7 Hari)
  const handleEndDateChange = (val) => {
    setRangeWarning('');

    if (startDate && val) {
      const s = new Date(startDate);
      const e = new Date(val);
      const diffDays = Math.floor((e - s) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        setRangeWarning('Tanggal akhir tidak boleh lebih awal dari tanggal mulai.');
        setEndDate(startDate);
        return;
      }

      if (diffDays > 6) {
        // Otomatis batasi ke startDate + 6 hari
        const maxEnd = new Date(s);
        maxEnd.setDate(maxEnd.getDate() + 6);
        const maxEndStr = getLocalDate(maxEnd);
        setEndDate(maxEndStr);
        setRangeWarning('Rentang tanggal disesuaikan ke maksimal 7 hari.');
        return;
      }
    }

    setEndDate(val);
  };

  // Extract PAID orders only
  const allPaidOrders = orders.filter(o => o.status === 'PAID');

  // Filter orders based on active filterMode
  const filteredPaidOrders = useMemo(() => {
    return allPaidOrders.filter(o => {
      const orderDate = o.date || todayStr;
      if (filterMode === 'Hari Ini') {
        return orderDate === todayStr;
      }
      if (filterMode === 'Custom') {
        if (!startDate || !endDate) return true;
        return orderDate >= startDate && orderDate <= endDate;
      }
      return true;
    }).sort((a, b) => {
      // Sort newest first
      const dateA = a.date || todayStr;
      const dateB = b.date || todayStr;
      if (dateA !== dateB) return dateB > dateA ? 1 : -1;
      return (b.paidAt || b.createdAt || '') > (a.paidAt || a.createdAt || '') ? 1 : -1;
    });
  }, [allPaidOrders, filterMode, startDate, endDate, todayStr]);

  // Compute 3 Key Indicators: TOTAL OMSET, TOTAL QRIS, TOTAL TUNAI
  const totalOmset = filteredPaidOrders.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalQRIS = filteredPaidOrders
    .filter(o => o.paymentMethod === 'QRIS')
    .reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalTunai = filteredPaidOrders
    .filter(o => o.paymentMethod === 'TUNAI' || !o.paymentMethod)
    .reduce((acc, curr) => acc + (curr.total || 0), 0);

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

  // Export Laporan ke Excel Profesional (.xlsx)
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
      'Detail Menu': `${filteredPaidOrders.length} Transaksi`,
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
    const filenameLabel = filterMode === 'Hari Ini' ? `HariIni_${todayStr}` : `Custom_${startDate}_sd_${endDate}`;
    XLSX.writeFile(workbook, `${safeStorePrefix}_Laporan_${filenameLabel}.xlsx`);
  };

  // Cetak Laporan (Print)
  const handlePrintReport = () => {
    window.print();
  };

  const activePeriodLabel = filterMode === 'Hari Ini'
    ? `Hari Ini (${formatDateToDDMMYYYY(todayStr)})`
    : `${formatDateToDDMMYYYY(startDate)} s/d ${formatDateToDDMMYYYY(endDate)}`;

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
            <div><strong>Dicetak:</strong> {formatDateToDDMMYYYY(todayStr)} {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
            <div><strong>Total Transaksi:</strong> {filteredPaidOrders.length} Pesanan Lunas</div>
          </div>
        </div>

        {/* Ringkasan Omset Cetak (Kotak Bersih Minimalis) */}
        <div className="grid grid-cols-3 gap-4 border border-stone-300 rounded-xl p-4 bg-stone-50">
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase">Total Omset Penjualan</div>
            <div className="text-xl font-black text-stone-900">
              Rp {totalOmset.toLocaleString('id-ID')}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase">Total Pembayaran QRIS</div>
            <div className="text-xl font-black text-stone-900">
              Rp {totalQRIS.toLocaleString('id-ID')}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-500 uppercase">Total Pembayaran Tunai</div>
            <div className="text-xl font-black text-stone-900">
              Rp {totalTunai.toLocaleString('id-ID')}
            </div>
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
                    {formatDateToDDMMYYYY(o.date || todayStr)}<br/>
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
        {/* Warning jika rentang > 7 hari */}
        {rangeWarning && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{rangeWarning}</span>
          </div>
        )}

        {/* Date Filter & Action Header (Hari Ini / Custom + Export Excel + Cetak) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-100/50">
          {/* Filter Chips: Hanya 'Hari Ini' & 'Custom' */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="flex bg-emerald-50 p-1 rounded-2xl border border-emerald-100">
                <button
                  type="button"
                  onClick={() => setFilterMode('Hari Ini')}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    filterMode === 'Hari Ini'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-emerald-900/70 hover:bg-white/60'
                  }`}
                >
                  Hari Ini
                </button>

                <button
                  type="button"
                  onClick={() => setFilterMode('Custom')}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    filterMode === 'Custom'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-emerald-900/70 hover:bg-white/60'
                  }`}
                >
                  Custom Range (Maks 7 Hari)
                </button>
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
                Digital Payment
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
                Uang Kas Laci
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Grid: Tabel Riwayat Transaksi & Laporan Bestseller */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tabel Riwayat Transaksi */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm shadow-emerald-100/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-emerald-950 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <span>Tabel Riwayat Transaksi (PAID)</span>
              </h4>
              <span className="text-xs text-stone-500 font-medium">
                Periode: <strong>{activePeriodLabel}</strong>
              </span>
            </div>

            {filteredPaidOrders.length === 0 ? (
              <div className="text-center py-10 text-xs text-stone-500">
                Belum ada riwayat transaksi pada rentang waktu ini.
              </div>
            ) : (
              /* Scrollable Container dengan kelas Tailwind persis sesuai spesifikasi */
              <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-emerald-100">
                <table className="w-full text-left text-xs min-w-[520px]">
                  <thead className="bg-emerald-50/80 sticky top-0 z-10">
                    <tr className="border-b border-emerald-100 text-emerald-900 font-bold">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-3">Tipe</th>
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">Metode</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50">
                    {filteredPaidOrders.map(order => (
                      <tr key={order.id} className="hover:bg-emerald-50/40">
                        <td className="py-3 px-3 text-stone-600 font-medium">
                          {formatDateToDDMMYYYY(order.date || todayStr)}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-950">{order.customerName}</td>
                        <td className="py-3 px-3 text-stone-600">
                          <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                            order.orderType === 'Pesan Dulu' 
                              ? 'bg-teal-100 text-teal-800'
                              : order.orderType === 'Bungkus'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {order.orderType}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-500">{order.paidAt || order.createdAt}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                            order.paymentMethod === 'QRIS' ? 'bg-teal-100 text-teal-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {order.paymentMethod || 'TUNAI'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-emerald-700 text-right">
                          Rp {order.total.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              Acuan belanja bahan baku koki berdasarkan filter.
            </p>

            {bestsellerList.length === 0 ? (
              <div className="text-center py-10 text-xs text-stone-500">
                Belum ada item terjual pada rentang waktu ini.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
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
