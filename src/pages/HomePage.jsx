import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getLocalDate, getWIBTimeString } from '../utils/dateHelper';
import { 
  User, 
  Utensils, 
  ShoppingBag, 
  Clock, 
  Plus, 
  Minus, 
  Receipt, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export default function HomePage() {
  const { menuItems, setOrders, draftOrder, setDraftOrder, setActiveNav } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [errorMsg, setErrorMsg] = useState('');

  // Categories
  const categories = ['Semua', 'Makanan', 'Minuman', 'Snack'];

  // Filter menus: exclude 'Sembunyikan' items from ordering catalog
  const visibleMenus = menuItems.filter(item => {
    if (item.status === 'Sembunyikan') return false;
    if (selectedCategory !== 'Semua' && item.category !== selectedCategory) return false;
    return true;
  });

  // Calculate totals
  const totalItemsCount = Object.values(draftOrder.items).reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const grandTotal = Object.entries(draftOrder.items).reduce((acc, [itemId, itemData]) => {
    const product = menuItems.find(m => m.id === itemId);
    if (!product || !itemData.quantity) return acc;
    return acc + (product.price * itemData.quantity);
  }, 0);

  // Quantity control helpers
  const handleQuantityChange = (itemId, newQty) => {
    const qty = Math.max(0, parseInt(newQty) || 0);
    setDraftOrder(prev => {
      const currentItems = { ...prev.items };
      if (qty === 0) {
        delete currentItems[itemId];
      } else {
        currentItems[itemId] = {
          quantity: qty,
          notes: currentItems[itemId]?.notes || ''
        };
      }
      return { ...prev, items: currentItems };
    });
  };

  const handleNotesChange = (itemId, notes) => {
    setDraftOrder(prev => {
      const currentItems = { ...prev.items };
      if (currentItems[itemId]) {
        currentItems[itemId] = {
          ...currentItems[itemId],
          notes: notes
        };
      }
      return { ...prev, items: currentItems };
    });
  };

  // Submit & Open Bill
  const handleSaveAndOpenBill = () => {
    if (!draftOrder.customerName.trim()) {
      setErrorMsg('Nama Pelanggan wajib diisi sebelum membuka tagihan!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (totalItemsCount === 0) {
      setErrorMsg('Pilih minimal 1 menu sebelum membuka tagihan!');
      return;
    }

    setErrorMsg('');

    const now = new Date();
    const timeString = getWIBTimeString(now);
    const dateString = getLocalDate(now);

    // Format items detail for the order
    const orderedItems = Object.entries(draftOrder.items).map(([itemId, data]) => {
      const product = menuItems.find(m => m.id === itemId);
      return {
        id: itemId,
        name: product?.name || 'Item',
        price: product?.price || 0,
        quantity: data.quantity,
        notes: data.notes || '',
        subtotal: (product?.price || 0) * data.quantity
      };
    });

    if (draftOrder.editingOrderId) {
      // Update existing order (Open Bill injection)
      setOrders(prev => prev.map(o => {
        if (o.id === draftOrder.editingOrderId) {
          return {
            ...o,
            customerName: draftOrder.customerName.trim(),
            orderType: draftOrder.orderType,
            items: orderedItems,
            total: grandTotal,
            updatedAt: timeString
          };
        }
        return o;
      }));
    } else {
      // Create new UNPAID bill
      const newOrder = {
        id: 'ORD-' + Date.now().toString().slice(-6),
        customerName: draftOrder.customerName.trim(),
        orderType: draftOrder.orderType,
        items: orderedItems,
        total: grandTotal,
        status: 'UNPAID',
        createdAt: timeString,
        date: dateString,
        paymentMethod: null
      };
      setOrders(prev => [newOrder, ...prev]);
    }

    // Reset draft and navigate to Dashboard
    setDraftOrder({
      customerName: '',
      orderType: 'Makan Sini',
      items: {},
      editingOrderId: null
    });
    setActiveNav('dashboard');
  };

  return (
    <div className="space-y-5 pb-28 lg:pb-16">
      {/* Alert Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Notice if Editing Existing Open Bill */}
      {draftOrder.editingOrderId && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Menambah Menu ke Tagihan Terbuka ({draftOrder.customerName})</span>
          </div>
          <button
            onClick={() => setDraftOrder({ customerName: '', orderType: 'Makan Sini', items: {}, editingOrderId: null })}
            className="text-xs bg-white px-3 py-1 rounded-xl border border-amber-200 text-amber-800 hover:bg-amber-100/50"
          >
            Batal
          </button>
        </div>
      )}

      {/* Customer Header Box & 3-Option Order Type */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm shadow-emerald-100/50 border border-emerald-100/80 space-y-4">
        {/* Customer Name Input (Mandatory, no harsh borders, soft green ring) */}
        <div>
          <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nama Pelanggan <span className="text-rose-500">*</span></span>
          </label>
          <input
            type="text"
            value={draftOrder.customerName}
            onChange={(e) => {
              setDraftOrder(prev => ({ ...prev, customerName: e.target.value }));
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="Contoh: Pak Budi, Meja Depan, Kak Maya..."
            className="w-full px-4 py-3 rounded-2xl bg-emerald-100/40 text-emerald-950 font-bold text-sm sm:text-base placeholder:text-emerald-700/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/80 transition-all border-none"
          />
        </div>

        {/* Tipe Pesanan (3 Opsi: Makan Sini, Bungkus, Pesan Dulu) */}
        <div>
          <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
            Tipe Pesanan <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2 bg-emerald-50/70 p-1.5 rounded-2xl border border-emerald-100/80">
            {/* 1. Makan Sini */}
            <button
              type="button"
              onClick={() => setDraftOrder(prev => ({ ...prev, orderType: 'Makan Sini' }))}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 rounded-xl font-bold text-xs transition-all duration-200 ${
                draftOrder.orderType === 'Makan Sini'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  : 'text-emerald-900/70 hover:bg-white/60'
              }`}
            >
              <Utensils className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Makan Sini</span>
            </button>

            {/* 2. Bungkus */}
            <button
              type="button"
              onClick={() => setDraftOrder(prev => ({ ...prev, orderType: 'Bungkus' }))}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 rounded-xl font-bold text-xs transition-all duration-200 ${
                draftOrder.orderType === 'Bungkus'
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                  : 'text-emerald-900/70 hover:bg-white/60'
              }`}
            >
              <ShoppingBag className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Bungkus</span>
            </button>

            {/* 3. Pesan Dulu (Ambil Nanti/Online) */}
            <button
              type="button"
              onClick={() => setDraftOrder(prev => ({ ...prev, orderType: 'Pesan Dulu' }))}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 rounded-xl font-bold text-xs transition-all duration-200 ${
                draftOrder.orderType === 'Pesan Dulu'
                  ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                  : 'text-emerald-900/70 hover:bg-white/60'
              }`}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left truncate">
                <span className="leading-tight truncate">Pesan Dulu</span>
                <span className="text-[9px] font-normal opacity-90 hidden sm:inline leading-none">Ambil Nanti/Online</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Jika Belum Ada Menu Sama Sekali (Zero Default Data) */}
      {menuItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-dashed border-emerald-200 shadow-sm shadow-emerald-100/40 max-w-lg mx-auto space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <Utensils className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-emerald-950">Katalog Menu Masih Kosong</h3>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              KokiKasir siap digunakan! Tambahkan menu makanan, minuman, atau snack pertama Anda untuk mulai melayani pelanggan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveNav('menu')}
            className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Menu Pertama</span>
          </button>
        </div>
      ) : (
        <>
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 sm:px-5 py-2 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-105'
                      : 'bg-white text-emerald-900/70 hover:bg-emerald-100/50 border border-emerald-100 shadow-xs'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Menu Catalog Grid: WAJIB 2 Kolom di Layar HP (grid-cols-2) & 3-4 di Desktop */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
            {visibleMenus.map(item => {
              const isSoldOut = item.status === 'Habis';
              const qty = draftOrder.items[item.id]?.quantity || 0;
              const notes = draftOrder.items[item.id]?.notes || '';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border transition-all duration-200 flex flex-col justify-between ${
                    isSoldOut
                      ? 'opacity-60 bg-stone-50 border-stone-200 pointer-events-none filter grayscale'
                      : qty > 0
                      ? 'border-emerald-400 shadow-md shadow-emerald-100 ring-2 ring-emerald-300/40'
                      : 'border-emerald-100/80 shadow-sm shadow-emerald-100/50 hover:shadow-md hover:border-emerald-200'
                  }`}
                >
                  <div>
                    {/* Image & Badges */}
                    <div className="relative h-28 sm:h-36 md:h-40 w-full mb-2.5 rounded-xl sm:rounded-2xl overflow-hidden bg-emerald-50">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSoldOut && (
                        <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center p-1 text-center">
                          <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] sm:text-xs font-extrabold uppercase rounded-full tracking-wider shadow-sm">
                            Habis
                          </span>
                        </div>
                      )}
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur-xs text-[10px] font-bold text-emerald-900 rounded-lg shadow-xs">
                        {item.category}
                      </span>
                    </div>

                    {/* Name & Price */}
                    <h3 className="font-bold text-emerald-950 text-xs sm:text-sm md:text-base leading-snug line-clamp-2 mb-1">
                      {item.name}
                    </h3>
                    <div className="text-emerald-700 font-black text-xs sm:text-sm mb-2.5">
                      Rp {item.price.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {/* Quantity Controls & Notes Input */}
                  {!isSoldOut && (
                    <div className="space-y-2 pt-2 border-t border-emerald-50">
                      {/* Quantity Controller: (-) | [Input] | (+) */}
                      <div className="flex items-center justify-between bg-emerald-50/80 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-emerald-100">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, qty - 1)}
                          disabled={qty === 0}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white text-emerald-800 flex items-center justify-center font-bold transition-all shadow-xs disabled:opacity-30 disabled:shadow-none hover:bg-emerald-100/50 active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center justify-center flex-1 px-1">
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-10 sm:w-12 text-center font-black text-emerald-950 bg-transparent text-sm sm:text-base focus:outline-none focus:ring-1 focus:ring-emerald-400 rounded-md py-0.5"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, qty + 1)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold transition-all shadow-xs hover:bg-emerald-600 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Catatan Per-Menu: Wajib muncul jika kuantitas > 0 */}
                      {qty > 0 && (
                        <div className="animate-fade-in pt-1">
                          <div className="relative">
                            <input
                              type="text"
                              value={notes}
                              onChange={(e) => handleNotesChange(item.id, e.target.value)}
                              placeholder="Catatan: misal pedas, tanpa bawang"
                              className="w-full text-[11px] sm:text-xs px-2.5 py-1.5 sm:py-2 rounded-xl bg-emerald-100/40 text-emerald-950 placeholder:text-emerald-700/50 border border-emerald-200/60 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Floating Bottom Summary & Action Bar */}
      <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 z-30 px-3 md:px-8">
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-3.5 sm:p-5 shadow-xl shadow-emerald-950/10 border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex flex-col">
              <span className="text-[11px] sm:text-xs font-semibold text-emerald-700/80">
                {totalItemsCount} Menu Dipilih • <span className="font-bold text-emerald-900">{draftOrder.orderType}</span>
              </span>
              {/* Oversized, Bold, Emerald-700 Grand Total */}
              <div className="text-xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                Rp {grandTotal.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* Action Button: Simpan & Buka Tagihan */}
          <button
            type="button"
            onClick={handleSaveAndOpenBill}
            className="w-full sm:w-auto px-5 sm:px-7 py-3 sm:py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all duration-200"
          >
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Simpan & Buka Tagihan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
