import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Logo from '../components/Logo';
import { compressImageToBase64 } from '../utils/imageHelper';
import {
  getLocalDate,
  formatDateToDDMMYYYY,
  isTodayDate,
  isWithinLast7Days
} from '../utils/dateHelper';
import {
  Clock,
  User,
  Utensils,
  ShoppingBag,
  PlusCircle,
  Trash2,
  CheckCircle,
  X,
  CreditCard,
  Banknote,
  Printer,
  AlertTriangle,
  Upload,
  Camera,
  Calendar,
  ChevronRight,
  ChevronDown,
  Info
} from 'lucide-react';

/**
 * Helper untuk mengelompokkan pesanan berdasarkan tanggal
 */
function groupOrdersByDate(ordersList) {
  const groups = {};
  ordersList.forEach(order => {
    const rawDate = order.date || getLocalDate();
    if (!groups[rawDate]) {
      groups[rawDate] = [];
    }
    groups[rawDate].push(order);
  });

  // Urutkan tanggal dari yang terbaru (descending)
  const sortedDates = Object.keys(groups).sort((a, b) => (b > a ? 1 : -1));
  return sortedDates.map(date => ({
    rawDate: date,
    formattedDate: formatDateToDDMMYYYY(date),
    orders: groups[date]
  }));
}

export default function DashboardPage() {
  const { orders, setOrders, setDraftOrder, setActiveNav, qrisImage, setQrisImage, storeSettings } = useApp();
  const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' | 'history'

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('QRIS'); // 'QRIS' | 'TUNAI'
  const [cashGiven, setCashGiven] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Accordion state untuk Tab Riwayat Lunas (PAID)
  // Default: Hari ini otomatis terbuka, tanggal sebelumnya tertutup
  const todayKey = getLocalDate();
  const [expandedDates, setExpandedDates] = useState(() => ({
    [todayKey]: true
  }));

  const toggleDateAccordion = (rawDate) => {
    setExpandedDates(prev => ({
      ...prev,
      [rawDate]: !prev[rawDate]
    }));
  };

  // QRIS upload ref
  const qrisFileInputRef = useRef(null);
  const [qrisUploadLoading, setQrisUploadLoading] = useState(false);

  // 1. Filter UNPAID Orders (semua tagihan terbuka, urutkan jam lama ke baru per tanggal)
  const unpaidOrders = orders
    .filter(o => o.status === 'UNPAID')
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  const unpaidGroups = groupOrdersByDate(unpaidOrders);

  // 2. Filter PAID Orders (HANYA 7 HARI TERAKHIR berdasarkan waktu lokal)
  const paidOrders = orders
    .filter(o => o.status === 'PAID')
    .filter(o => isWithinLast7Days(o.date || getLocalDate()))
    .sort((a, b) => (b.paidAt || b.createdAt) > (a.paidAt || a.createdAt) ? 1 : -1);
  const paidGroups = groupOrdersByDate(paidOrders);

  // Fast Cash calculations
  const numCashGiven = parseInt(cashGiven) || 0;
  const changeAmount = Math.max(0, numCashGiven - (selectedOrder?.total || 0));

  // Handler: Update Order (Redirect back to Home to inject items)
  const handleUpdateOrder = (order) => {
    const itemMap = {};
    order.items.forEach(item => {
      itemMap[item.id] = {
        quantity: item.quantity,
        notes: item.notes || ''
      };
    });

    setDraftOrder({
      customerName: order.customerName,
      orderType: order.orderType || 'Makan Sini',
      items: itemMap,
      editingOrderId: order.id
    });

    setSelectedOrder(null);
    setActiveNav('home');
  };

  // Handler: Void Bill
  const handleVoidOrder = () => {
    if (!selectedOrder) return;
    setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
    setShowVoidConfirm(false);
    setSelectedOrder(null);
  };

  // Handler: Confirm Payment
  const handleConfirmPayment = () => {
    if (!selectedOrder) return;
    const now = new Date();
    const paidTimeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const paidRecord = {
      ...selectedOrder,
      status: 'PAID',
      paymentMethod: paymentMethod,
      cashGiven: paymentMethod === 'TUNAI' ? numCashGiven : selectedOrder.total,
      change: paymentMethod === 'TUNAI' ? changeAmount : 0,
      paidAt: paidTimeString,
      date: selectedOrder.date || getLocalDate()
    };

    setOrders(prev => prev.map(o => o.id === selectedOrder.id ? paidRecord : o));
    setCompletedOrder(paidRecord);
    setShowPayModal(false);
    setSelectedOrder(null);
    setShowReceiptModal(true);
  };

  // Handler: Upload QRIS Image (Base64 saved to LocalStorage via AppContext)
  const handleQRISFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setQrisUploadLoading(true);
      const base64 = await compressImageToBase64(file, 600, 0.85);
      setQrisImage(base64);
    } catch (err) {
      alert('Gagal memproses gambar QRIS: ' + err.message);
    } finally {
      setQrisUploadLoading(false);
    }
  };

  // Order type badge visual helper
  const getOrderTypeBadge = (type) => {
    switch (type) {
      case 'Makan Sini':
        return (
          <span className="px-2.5 py-0.5 sm:py-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 bg-emerald-100/80 text-emerald-800">
            <Utensils className="w-3 h-3" />
            <span>Makan Sini</span>
          </span>
        );
      case 'Bungkus':
        return (
          <span className="px-2.5 py-0.5 sm:py-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 bg-amber-100 text-amber-800">
            <ShoppingBag className="w-3 h-3" />
            <span>Bungkus</span>
          </span>
        );
      case 'Pesan Dulu':
        return (
          <span className="px-2.5 py-0.5 sm:py-1 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 bg-teal-100 text-teal-800">
            <Clock className="w-3 h-3" />
            <span>Pesan Dulu</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 2-Tab Navigation (UNPAID vs HISTORY PAID) */}
      <div className="flex bg-white/90 p-1.5 rounded-2xl border border-emerald-100 shadow-xs max-w-md">
        <button
          onClick={() => setActiveTab('unpaid')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'unpaid'
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
              : 'text-emerald-900/70 hover:bg-emerald-50'
            }`}
        >
          <span>Tagihan Terbuka</span>
          {unpaidOrders.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'unpaid' ? 'bg-white text-emerald-700' : 'bg-amber-100 text-amber-800'
              }`}>
              {unpaidOrders.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'history'
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
              : 'text-emerald-900/70 hover:bg-emerald-50'
            }`}
        >
          <span>Riwayat Lunas</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'history' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
            {paidOrders.length}
          </span>
        </button>
      </div>

      {/* Tab 1: UNPAID Orders Grouped by Date */}
      {activeTab === 'unpaid' && (
        <div className="space-y-5">
          {unpaidGroups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-emerald-200 p-8 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-emerald-950 text-lg mb-1">
                Tidak Ada Tagihan Terbuka
              </h3>
              <p className="text-xs text-emerald-700/70 max-w-sm mx-auto mb-4">
                Semua pesanan saat ini sudah selesai dibayar. Buka tab "Buat Pesanan" untuk melayani pelanggan baru.
              </p>
              <button
                onClick={() => setActiveNav('home')}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 shadow-sm shadow-emerald-500/20"
              >
                + Buat Pesanan Baru
              </button>
            </div>
          ) : (
            unpaidGroups.map(group => (
              <div
                key={group.rawDate}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-sm shadow-emerald-100/50"
              >
                {/* Header Tanggal (DD-MM-YYYY) */}
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-emerald-100/80">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-lg font-bold text-emerald-800 tracking-tight">
                      {group.formattedDate}
                    </h4>
                    {isTodayDate(group.rawDate) && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                    {group.orders.length} Tagihan
                  </span>
                </div>

                {/* Scrollable DIV per Tanggal */}
                <div className="max-h-80 overflow-y-auto pr-2 flex flex-col gap-3">
                  {group.orders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setCashGiven(order.total.toString());
                      }}
                      className="p-4 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50/80 border border-emerald-100/90 hover:border-emerald-300 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-emerald-600">
                            {order.id}
                          </span>
                          <span className="text-stone-300">•</span>
                          <div className="flex items-center gap-1 text-xs text-stone-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{order.createdAt} WIB</span>
                          </div>
                          {getOrderTypeBadge(order.orderType)}
                        </div>

                        <h4 className="font-extrabold text-emerald-950 text-base leading-tight group-hover:text-emerald-700 transition-colors">
                          {order.customerName}
                        </h4>

                        {/* Rincian menu ringkas */}
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-emerald-900/80">
                          {order.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/80 border border-emerald-100 text-[11px]"
                            >
                              <span className="font-bold text-emerald-700">{item.quantity}x</span>
                              <span className="truncate max-w-[120px]">{item.name}</span>
                              {item.notes && <span className="text-amber-700 font-medium">({item.notes})</span>}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Total & Action Arrow */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-100">
                        <div className="text-[11px] text-stone-500 font-semibold sm:text-right">
                          Total Tagihan
                        </div>
                        <div className="text-lg font-black text-emerald-700">
                          Rp {order.total.toLocaleString('id-ID')}
                        </div>
                        <span className="text-[11px] text-emerald-600 font-bold group-hover:underline flex items-center gap-0.5 mt-0.5">
                          <span>Kelola / Bayar</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: HISTORY (PAID) Orders Grouped by Date dengan SISTEM ACCORDION */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Banner Informasi Pembatasan 7 Hari Terakhir */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Menampilkan riwayat lunas <strong>7 hari terakhir</strong>. Data arsip lengkap tersedia di halaman <strong>Laporan</strong>.
              </span>
            </div>
          </div>

          {paidGroups.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-emerald-100 text-stone-500 text-xs">
              Belum ada riwayat pesanan yang lunas dalam 7 hari terakhir.
            </div>
          ) : (
            paidGroups.map(group => {
              const isExpanded = !!expandedDates[group.rawDate];
              const groupTotalRevenue = group.orders.reduce((acc, o) => acc + (o.total || 0), 0);

              return (
                <div
                  key={group.rawDate}
                  className="bg-white rounded-3xl border border-emerald-100/90 shadow-sm shadow-emerald-100/40 overflow-hidden transition-all duration-200"
                >
                  {/* Header Tanggal (DD-MM-YYYY) berbentuk Bar Kotak yang Rapi & Clickable */}
                  <div
                    onClick={() => toggleDateAccordion(group.rawDate)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-emerald-50/50 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                        <Calendar className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base sm:text-lg font-bold text-emerald-950">
                            {group.formattedDate}
                          </h4>
                          {isTodayDate(group.rawDate) && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                          {group.orders.length} Transaksi Selesai • Total: <strong className="text-emerald-700">Rp {groupTotalRevenue.toLocaleString('id-ID')}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Chevron Icon (Buka / Tutup) */}
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'bg-emerald-100 text-emerald-800 rotate-180' : 'bg-stone-100 text-stone-600'
                        }`}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Expandable DIV Berisi Daftar Transaksi pada Tanggal Tersebut */}
                  {isExpanded && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-emerald-50 animate-fade-in">
                      <div className="max-h-80 overflow-y-auto pr-2 flex flex-col gap-2.5">
                        {group.orders.map(order => (
                          <div
                            key={order.id}
                            onClick={() => {
                              setCompletedOrder(order);
                              setShowReceiptModal(true);
                            }}
                            className="py-3 px-3.5 rounded-2xl bg-stone-50/80 hover:bg-emerald-50/70 border border-stone-200/70 hover:border-emerald-200 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs flex-shrink-0">
                                PAID
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-emerald-950 text-sm truncate">{order.customerName}</h4>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-stone-200 font-semibold text-stone-600">
                                    {order.orderType}
                                  </span>
                                </div>
                                <p className="text-[11px] text-stone-500 mt-0.5">
                                  Jam {order.paidAt || order.createdAt} • {order.paymentMethod || 'TUNAI'} • {order.items.length} Menu
                                </p>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="font-extrabold text-emerald-700 text-sm">
                                Rp {order.total.toLocaleString('id-ID')}
                              </div>
                              <span className="text-[10px] text-emerald-600 font-bold group-hover:underline">
                                Lihat Struk
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: Detail Order & Action (3 Buttons: Tambah Pesanan, Batalkan/Void, Bayar) */}
      {selectedOrder && !showPayModal && !showVoidConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 animate-fade-in space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-emerald-100">
              <div>
                <span className="text-xs font-bold text-emerald-600">{selectedOrder.id}</span>
                <h3 className="text-xl font-black text-emerald-950">{selectedOrder.customerName}</h3>
                <span className="text-xs text-stone-500">
                  {selectedOrder.orderType} • Tanggal {formatDateToDDMMYYYY(selectedOrder.date)} Jam {selectedOrder.createdAt} WIB
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items Breakdown with Notes */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-emerald-950">
                      {item.quantity}x {item.name}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1 font-medium">
                        Catatan: {item.notes}
                      </div>
                    )}
                  </div>
                  <div className="font-extrabold text-sm text-emerald-800">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-emerald-100 flex items-center justify-between">
              <span className="text-sm font-bold text-stone-600">Total Tagihan:</span>
              <span className="text-2xl font-black text-emerald-700">
                Rp {selectedOrder.total.toLocaleString('id-ID')}
              </span>
            </div>

            {/* 3 Main Action Buttons as mandated by CONTEXT.md */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              {/* 1. Tambah Pesanan (Update Order) */}
              <button
                onClick={() => handleUpdateOrder(selectedOrder)}
                className="py-3 px-3 rounded-2xl bg-emerald-100 text-emerald-900 font-bold text-xs hover:bg-emerald-200/80 transition-all flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-emerald-700" />
                <span>Tambah Menu</span>
              </button>

              {/* 2. Batalkan Tagihan (Void) */}
              <button
                onClick={() => setShowVoidConfirm(true)}
                className="py-3 px-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs hover:bg-rose-100 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Batalkan</span>
              </button>

              {/* 3. Bayar (Checkout) */}
              <button
                onClick={() => setShowPayModal(true)}
                className="py-3 px-3 rounded-2xl bg-emerald-500 text-white font-black text-xs hover:bg-emerald-600 shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Bayar Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP KONFIRMASI VOID (Warna Merah Soft / bg-rose-500 sesuai spek) */}
      {showVoidConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 text-center animate-fade-in space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-black text-rose-950">Batalkan Tagihan Ini?</h4>
              <p className="text-xs text-stone-600 mt-1">
                Pesanan atas nama <strong>{selectedOrder?.customerName}</strong> akan dihapus permanen dari sistem.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowVoidConfirm(false)}
                className="py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200"
              >
                Kembali
              </button>
              <button
                onClick={handleVoidOrder}
                className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-md shadow-rose-500/20"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROSES BAYAR (QRIS dengan Base64 upload & TUNAI Cepat) */}
      {showPayModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 animate-fade-in space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div>
                <h3 className="text-lg font-black text-emerald-950">Pembayaran Kasir</h3>
                <p className="text-xs text-stone-500">
                  Pelanggan: <strong className="text-emerald-900">{selectedOrder.customerName}</strong> ({selectedOrder.orderType})
                </p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total tagihan highlight */}
            <div className="text-center p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-800">Total yang harus dibayar:</span>
              <div className="text-3xl font-black text-emerald-700 mt-0.5">
                Rp {selectedOrder.total.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-2">Pilih Metode Pembayaran:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QRIS')}
                  className={`py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${paymentMethod === 'QRIS'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25'
                      : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                    }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>QRIS (Digital)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('TUNAI')}
                  className={`py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${paymentMethod === 'TUNAI'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25'
                      : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                    }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>TUNAI (Cash)</span>
                </button>
              </div>
            </div>

            {/* QRIS View dengan Base64 upload & persistence di LocalStorage */}
            {paymentMethod === 'QRIS' && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-3 animate-fade-in">
                {/* Hidden File Input dengan HTML5 Camera Capture */}
                <input
                  type="file"
                  ref={qrisFileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleQRISFileChange}
                  className="hidden"
                />

                {qrisImage ? (
                  <div className="space-y-2">
                    <div className="max-w-[200px] max-h-[200px] mx-auto bg-white p-2 rounded-2xl shadow-sm border border-emerald-200 overflow-hidden flex items-center justify-center">
                      <img
                        src={qrisImage}
                        alt="QRIS Toko"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => qrisFileInputRef.current?.click()}
                        className="text-xs px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Ganti QRIS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrisImage('')}
                        className="text-xs px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold shadow-xs"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 px-2 space-y-2">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div className="font-extrabold text-sm text-stone-800">
                      Belum Ada Gambar QRIS Statis
                    </div>
                    <p className="text-xs text-stone-500 max-w-xs mx-auto">
                      Foto langsung barcode QRIS toko Anda atau pilih dari galeri untuk disimpan permanen.
                    </p>
                    <button
                      type="button"
                      disabled={qrisUploadLoading}
                      onClick={() => qrisFileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-sm shadow-emerald-500/20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{qrisUploadLoading ? 'Memproses...' : 'Foto / Upload QRIS Toko'}</span>
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-stone-500">
                  Pelanggan scan barcode QRIS menggunakan GoPay, OVO, Dana, BCA, dll.
                </p>
              </div>
            )}

            {/* TUNAI View (Fitur Tunai Cepat: Uang Diterima, Kembalian, Tombol Cepat) */}
            {paymentMethod === 'TUNAI' && (
              <div className="space-y-3 animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    Uang Diterima (Rp):
                  </label>
                  <input
                    type="number"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-950 font-black text-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="0"
                  />
                </div>

                {/* 3 Tombol Nominal Cepat: Uang Pas, 50.000, 100.000 */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCashGiven(selectedOrder.total.toString())}
                    className="py-2 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven('50000')}
                    className="py-2 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
                  >
                    50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashGiven('100000')}
                    className="py-2 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
                  >
                    100.000
                  </button>
                </div>

                {/* Real-time Kembalian */}
                <div className="p-3.5 rounded-2xl bg-emerald-100/60 border border-emerald-200/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Kembalian:</span>
                  <span className="text-xl font-black text-emerald-800">
                    Rp {changeAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}

            {/* Selesai Bayar Button */}
            <button
              onClick={handleConfirmPayment}
              disabled={paymentMethod === 'TUNAI' && numCashGiven < selectedOrder.total}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-black text-base shadow-lg shadow-emerald-500/25 transition-all"
            >
              Konfirmasi & Cetak Struk
            </button>
          </div>
        </div>
      )}

      {/* STRUK DIGITAL (Digital Receipt Popup with Dynamic Store Settings) */}
      {showReceiptModal && completedOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 animate-fade-in space-y-4">
            {/* Receipt Paper Styling */}
            <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 font-mono text-xs text-stone-800 space-y-3">
              {/* Logo & Header Dinamis Berdasarkan storeSettings */}
              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <div className="flex justify-center mb-1.5">
                  {storeSettings?.logo ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-stone-200 p-0.5 shadow-xs">
                      <img
                        src={storeSettings.logo}
                        alt="Logo Toko"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <Logo size="sm" showText={false} />
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-stone-900 tracking-tight uppercase">
                  {storeSettings?.name || 'KokiKasir'}
                </h4>
                {storeSettings?.phone && (
                  <p className="text-[10px] text-stone-600 font-semibold">{storeSettings.phone}</p>
                )}
                {storeSettings?.hours && (
                  <p className="text-[9px] text-stone-400">{storeSettings.hours}</p>
                )}
                <div className="text-[10px] text-stone-400 mt-1">
                  {completedOrder.id} • {formatDateToDDMMYYYY(completedOrder.date)} {completedOrder.paidAt || completedOrder.createdAt}
                </div>
              </div>

              {/* Customer & Type */}
              <div className="text-[11px] pb-2 border-b border-dashed border-stone-300">
                <div>Pelanggan: <span className="font-bold">{completedOrder.customerName}</span></div>
                <div>Tipe: <span className="font-bold">{completedOrder.orderType}</span></div>
              </div>

              {/* Items */}
              <div className="space-y-1.5 pb-2 border-b border-dashed border-stone-300 text-[11px]">
                {completedOrder.items.map((it, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between">
                      <span>{it.quantity}x {it.name}</span>
                      <span>Rp {it.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {it.notes && (
                      <div className="text-[9px] text-stone-500 italic">*{it.notes}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment Details */}
              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between font-bold text-stone-900 text-xs">
                  <span>TOTAL</span>
                  <span>Rp {completedOrder.total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Metode</span>
                  <span>{completedOrder.paymentMethod}</span>
                </div>
                {completedOrder.paymentMethod === 'TUNAI' && (
                  <>
                    <div className="flex justify-between text-stone-600">
                      <span>Tunai Diterima</span>
                      <span>Rp {completedOrder.cashGiven?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Kembalian</span>
                      <span>Rp {completedOrder.change?.toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Bio / Pesan Penutup Dinamis */}
              <div className="text-center pt-2 text-[10px] text-stone-500 border-t border-dashed border-stone-300 leading-tight">
                {storeSettings?.bio || 'Terima kasih atas kunjungannya!\nSemoga menikmati hidangan koki kami.'}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak</span>
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setActiveTab('history');
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-500/25"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
