import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { compressImageToBase64 } from '../utils/imageHelper';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  CheckSquare, 
  Square, 
  GripVertical, 
  Upload, 
  Camera, 
  X, 
  Check, 
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Layers,
  Utensils,
  Coffee,
  Cookie,
  FolderOpen
} from 'lucide-react';

const DEFAULT_CATEGORIES = ['Makanan', 'Minuman', 'Snack'];

export default function MenuManagementPage() {
  const { menuItems, setMenuItems } = useApp();
  const [editingItem, setEditingItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // File Input Refs for Gallery & Camera
  const fileInputGalleryRef = useRef(null);
  const fileInputCameraRef = useRef(null);

  // Multi-Select & Wiggle Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const longPressTimeoutRef = useRef(null);

  // Drag and Drop State (Scoped per category)
  const [dragInfo, setDragInfo] = useState({ category: null, index: null });
  const [dragOverInfo, setDragOverInfo] = useState({ category: null, index: null });

  // Accordion State per Category (Default: all collapsed [])
  const [expandedCategories, setExpandedCategories] = useState([]);

  const toggleCategoryAccordion = (cat) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: 'Makanan',
    price: '',
    status: 'Tersedia', // Tersedia | Habis | Sembunyikan
    image: '',
    description: ''
  });

  // Group menu items by category
  const categoryGroups = useMemo(() => {
    const groups = {};
    DEFAULT_CATEGORIES.forEach(cat => {
      groups[cat] = [];
    });

    menuItems.forEach(item => {
      const cat = item.category || 'Makanan';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });

    return groups;
  }, [menuItems]);

  const activeCategories = Object.keys(categoryGroups);

  // Category Icon Helper
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Makanan': return <Utensils className="w-4 h-4" />;
      case 'Minuman': return <Coffee className="w-4 h-4" />;
      case 'Snack': return <Cookie className="w-4 h-4" />;
      default: return <FolderOpen className="w-4 h-4" />;
    }
  };

  // Long-Press Handlers for Multi-Select
  const handlePressStart = (id) => {
    if (isSelectMode) return;
    longPressTimeoutRef.current = setTimeout(() => {
      setIsSelectMode(true);
      setSelectedIds([id]);
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 550);
  };

  const handlePressEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleCardClick = (id) => {
    if (!isSelectMode) return;
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === menuItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(menuItems.map(m => m.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Hapus ${selectedIds.length} menu yang dipilih dari katalog?`)) {
      setMenuItems(prev => prev.filter(m => !selectedIds.includes(m.id)));
      setIsSelectMode(false);
      setSelectedIds([]);
    }
  };

  // Drag and Drop Handlers (Per-Category Reorder)
  const handleDragStart = (e, category, indexInCat) => {
    if (isSelectMode) return;
    handlePressEnd();
    setDragInfo({ category, index: indexInCat });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, category, indexInCat) => {
    if (isSelectMode) return;
    e.preventDefault();
    if (dragInfo.category !== category) return; // Only allow drag within same category
    if (dragInfo.index === indexInCat) return;
    setDragOverInfo({ category, index: indexInCat });
  };

  const handleDrop = (e, targetCategory, targetIndexInCat) => {
    if (isSelectMode) return;
    e.preventDefault();

    if (
      dragInfo.category !== targetCategory || 
      dragInfo.index === null || 
      dragInfo.index === targetIndexInCat
    ) {
      setDragInfo({ category: null, index: null });
      setDragOverInfo({ category: null, index: null });
      return;
    }

    const catItems = [...(categoryGroups[targetCategory] || [])];
    const [movedItem] = catItems.splice(dragInfo.index, 1);
    catItems.splice(targetIndexInCat, 0, movedItem);

    // Reconstruct full menuItems array preserving categories
    const reorderedFullList = [];
    activeCategories.forEach(cat => {
      if (cat === targetCategory) {
        reorderedFullList.push(...catItems);
      } else {
        reorderedFullList.push(...(categoryGroups[cat] || []));
      }
    });

    setMenuItems(reorderedFullList);
    setDragInfo({ category: null, index: null });
    setDragOverInfo({ category: null, index: null });
  };

  const handleDragEnd = () => {
    setDragInfo({ category: null, index: null });
    setDragOverInfo({ category: null, index: null });
  };

  // Quick move item up / down within category
  const handleMoveItemInCat = (e, category, indexInCat, direction) => {
    e.stopPropagation();
    const catItems = [...(categoryGroups[category] || [])];
    const newIndex = direction === 'up' ? indexInCat - 1 : indexInCat + 1;
    if (newIndex < 0 || newIndex >= catItems.length) return;

    const temp = catItems[indexInCat];
    catItems[indexInCat] = catItems[newIndex];
    catItems[newIndex] = temp;

    const reorderedFullList = [];
    activeCategories.forEach(cat => {
      if (cat === category) {
        reorderedFullList.push(...catItems);
      } else {
        reorderedFullList.push(...(categoryGroups[cat] || []));
      }
    });

    setMenuItems(reorderedFullList);
  };

  // Modal Handlers
  const handleOpenAdd = (defaultCat = 'Makanan') => {
    setFormData({
      id: 'm-' + Date.now().toString().slice(-5),
      name: '',
      category: defaultCat,
      price: '',
      status: 'Tersedia',
      image: '',
      description: ''
    });
    setEditingItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (e, item) => {
    e.stopPropagation();
    setFormData({ ...item });
    setEditingItem(item);
    setShowModal(true);
  };

  // Image upload via Base64 (supporting gallery & direct camera capture)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const base64 = await compressImageToBase64(file, 'menu');
      setFormData(prev => ({ ...prev, image: base64 }));
    } catch (err) {
      alert('Gagal memproses foto menu: ' + err.message);
    } finally {
      setIsProcessingImage(false);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleSaveMenu = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.category) return;

    const parsedPrice = parseInt(formData.price) || 0;
    const finalItem = {
      ...formData,
      image: formData.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80',
      price: parsedPrice
    };

    if (editingItem) {
      setMenuItems(prev => prev.map(m => m.id === editingItem.id ? finalItem : m));
    } else {
      setMenuItems(prev => [...prev, finalItem]);
    }

    // Auto expand category of saved item
    setExpandedCategories(prev => (prev.includes(finalItem.category) ? prev : [...prev, finalItem.category]));
    setShowModal(false);
  };

  const handleToggleStatus = (e, id, newStatus) => {
    e.stopPropagation();
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-16 select-none">
      {/* Top Action & Instructions Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm shadow-emerald-100/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-emerald-950 text-lg">Katalog & Manajemen Menu</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {menuItems.length} Total Menu
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Menu dikelompokkan per kategori. <strong>Tahan & Geser</strong> untuk atur urutan di tiap kategori. <strong>Tahan lama</strong> untuk mode hapus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Multi-Select Mode Button */}
          {menuItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
              }}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                isSelectMode
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-xs'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{isSelectMode ? 'Selesai Pilih' : 'Pilih Banyak'}</span>
            </button>
          )}

          {/* Tambah Menu Baru */}
          <button
            type="button"
            onClick={() => handleOpenAdd('Makanan')}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Menu</span>
          </button>
        </div>
      </div>

      {/* Empty State jika belum ada menu */}
      {menuItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-emerald-200 p-8 shadow-xs max-w-md mx-auto space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Plus className="w-8 h-8" />
          </div>
          <h4 className="font-extrabold text-emerald-950 text-lg">Belum Ada Menu Terdaftar</h4>
          <p className="text-xs text-stone-500">
            Katalog masih kosong. Klik tombol di bawah untuk menambahkan menu pertama Anda ke kategori Makanan, Minuman, atau Snack.
          </p>
          <button
            type="button"
            onClick={() => handleOpenAdd('Makanan')}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 shadow-sm shadow-emerald-500/20"
          >
            + Tambah Menu Pertama
          </button>
        </div>
      ) : (
        /* ACCORDION PER KATEGORI (Makanan, Minuman, Snack, dsb.) */
        <div className="space-y-4">
          {activeCategories.map((category) => {
            const itemsInCat = categoryGroups[category] || [];
            const isExpanded = expandedCategories.includes(category);

            return (
              <div
                key={category}
                className="bg-white rounded-3xl border border-emerald-100/90 shadow-sm shadow-emerald-100/40 overflow-hidden transition-all duration-200"
              >
                {/* Accordion Header Bar (Clickable) */}
                <div
                  onClick={() => toggleCategoryAccordion(category)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-emerald-50/40 cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${
                      isExpanded ? 'bg-emerald-500 text-white shadow-xs' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {getCategoryIcon(category)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base sm:text-lg font-bold text-emerald-950">
                          {category}
                        </h4>
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {itemsInCat.length} Menu
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">
                        {itemsInCat.length === 0 
                          ? 'Belum ada menu di kategori ini' 
                          : `${itemsInCat.filter(i => i.status === 'Tersedia').length} Tersedia • ${itemsInCat.filter(i => i.status === 'Habis').length} Habis`}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAdd(category);
                      }}
                      className="hidden sm:flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200/60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah ke {category}</span>
                    </button>

                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 ${
                      isExpanded ? 'bg-emerald-100 text-emerald-800 rotate-180' : 'bg-stone-100 text-stone-600'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Accordion Content: GRID 2 KOLOM (grid-cols-2) */}
                {isExpanded && (
                  <div className="px-3 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-emerald-50 animate-fade-in">
                    {itemsInCat.length === 0 ? (
                      <div className="text-center py-8 text-xs text-stone-400 border border-dashed border-stone-200 rounded-2xl my-2">
                        Belum ada menu di kategori {category}.{' '}
                        <button
                          type="button"
                          onClick={() => handleOpenAdd(category)}
                          className="text-emerald-600 font-bold underline ml-1"
                        >
                          Tambah Menu Sekarang
                        </button>
                      </div>
                    ) : (
                      /* Grid 2 Kolom (grid-cols-2) sesuai spesifikasi */
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {itemsInCat.map((item, indexInCat) => {
                          const isSelected = selectedIds.includes(item.id);
                          const isDragging = dragInfo.category === category && dragInfo.index === indexInCat;
                          const isDragOver = dragOverInfo.category === category && dragOverInfo.index === indexInCat;

                          return (
                            <div
                              key={item.id}
                              draggable={!isSelectMode}
                              onDragStart={(e) => handleDragStart(e, category, indexInCat)}
                              onDragOver={(e) => handleDragOver(e, category, indexInCat)}
                              onDrop={(e) => handleDrop(e, category, indexInCat)}
                              onDragEnd={handleDragEnd}
                              onTouchStart={() => handlePressStart(item.id)}
                              onTouchEnd={handlePressEnd}
                              onMouseDown={() => handlePressStart(item.id)}
                              onMouseUp={handlePressEnd}
                              onClick={() => handleCardClick(item.id)}
                              className={`relative bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none ${
                                isSelectMode ? 'animate-wiggle cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                              } ${
                                isSelected
                                  ? 'border-rose-500 ring-2 ring-rose-300/80 shadow-md bg-rose-50/20'
                                  : isDragOver
                                  ? 'border-emerald-500 ring-2 ring-emerald-300 scale-102 bg-emerald-50/50'
                                  : item.status === 'Sembunyikan'
                                  ? 'opacity-60 border-stone-200'
                                  : item.status === 'Habis'
                                  ? 'border-amber-200 bg-amber-50/20'
                                  : 'border-emerald-100 shadow-sm shadow-emerald-100/40 hover:shadow-md'
                              } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}`}
                            >
                              {/* Checkbox overlay saat Select Mode */}
                              {isSelectMode && (
                                <div className="absolute top-2.5 left-2.5 z-20">
                                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center shadow-md transition-colors ${
                                    isSelected ? 'bg-rose-600 text-white' : 'bg-white/90 text-stone-400 border border-stone-200'
                                  }`}>
                                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Square className="w-3.5 h-3.5" />}
                                  </div>
                                </div>
                              )}

                              {/* Grip Handle for Drag */}
                              {!isSelectMode && (
                                <div
                                  title="Tahan dan geser di kategori ini"
                                  className="absolute top-2.5 left-2.5 z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl bg-white/90 backdrop-blur-xs text-stone-500 hover:text-emerald-700 flex items-center justify-center shadow-xs cursor-grab active:cursor-grabbing border border-stone-100"
                                >
                                  <GripVertical className="w-3.5 h-3.5" />
                                </div>
                              )}

                              <div>
                                {/* Image & Badges */}
                                <div className="relative h-28 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden mb-2.5 bg-stone-100">
                                  <img
                                    src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80'}
                                    alt={item.name}
                                    className="w-full h-full object-cover pointer-events-none"
                                  />

                                  {/* Status Badge */}
                                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-xs ${
                                    item.status === 'Tersedia'
                                      ? 'bg-emerald-500 text-white'
                                      : item.status === 'Habis'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-stone-500 text-white'
                                  }`}>
                                    {item.status}
                                  </span>

                                  {/* Quick Move Arrows for Touch Screens */}
                                  {!isSelectMode && (
                                    <div className="absolute bottom-1.5 right-1.5 flex gap-1 bg-black/40 backdrop-blur-xs p-0.5 rounded-lg">
                                      <button
                                        type="button"
                                        disabled={indexInCat === 0}
                                        onClick={(e) => handleMoveItemInCat(e, category, indexInCat, 'up')}
                                        className="w-5 h-5 rounded bg-white/80 hover:bg-white text-stone-800 disabled:opacity-30 flex items-center justify-center shadow-xs"
                                        title="Geser ke atas"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={indexInCat === itemsInCat.length - 1}
                                        onClick={(e) => handleMoveItemInCat(e, category, indexInCat, 'down')}
                                        className="w-5 h-5 rounded bg-white/80 hover:bg-white text-stone-800 disabled:opacity-30 flex items-center justify-center shadow-xs"
                                        title="Geser ke bawah"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Info */}
                                <h4 className="font-extrabold text-emerald-950 text-xs sm:text-base mb-0.5 sm:mb-1 truncate">
                                  {item.name}
                                </h4>
                                <div className="text-emerald-700 font-black text-xs sm:text-sm mb-2">
                                  Rp {item.price.toLocaleString('id-ID')}
                                </div>
                              </div>

                              {/* Status Switcher & Edit Button */}
                              <div className="pt-2 border-t border-emerald-50 flex items-center justify-between gap-1 sm:gap-2">
                                <div className="flex gap-0.5 sm:gap-1 flex-wrap">
                                  <button
                                    type="button"
                                    title="Tersedia"
                                    disabled={isSelectMode}
                                    onClick={(e) => handleToggleStatus(e, item.id, 'Tersedia')}
                                    className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all ${
                                      item.status === 'Tersedia' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                                  >
                                    Tersedia
                                  </button>
                                  <button
                                    type="button"
                                    title="Habis"
                                    disabled={isSelectMode}
                                    onClick={(e) => handleToggleStatus(e, item.id, 'Habis')}
                                    className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all ${
                                      item.status === 'Habis' ? 'bg-amber-500 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                                  >
                                    Habis
                                  </button>
                                  <button
                                    type="button"
                                    title="Sembunyikan"
                                    disabled={isSelectMode}
                                    onClick={(e) => handleToggleStatus(e, item.id, 'Sembunyikan')}
                                    className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all ${
                                      item.status === 'Sembunyikan' ? 'bg-stone-600 text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                                  >
                                    Sembunyi
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  disabled={isSelectMode}
                                  onClick={(e) => handleOpenEdit(e, item)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0"
                                >
                                  <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING ACTION PANEL SAAT SELECT / WIGGLE MODE AKTIF */}
      {isSelectMode && (
        <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 z-40 px-3 md:px-8 animate-fade-in">
          <div className="max-w-2xl mx-auto bg-stone-900/95 backdrop-blur-md text-white rounded-3xl p-3.5 sm:p-4 shadow-2xl flex items-center justify-between gap-3 border border-stone-800">
            <div className="flex items-center gap-2.5 pl-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <div>
                <div className="font-extrabold text-xs sm:text-sm">
                  {selectedIds.length} Menu Terpilih
                </div>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-[11px] text-stone-400 hover:text-white underline"
                >
                  {selectedIds.length === menuItems.length ? 'Batal Pilih Semua' : 'Pilih Semua Menu'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedIds([]);
                }}
                className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={handleDeleteSelected}
                className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:pointer-events-none text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD / EDIT MENU (DENGAN KAMERA LANGSUNG & SELECT KATEGORI WAJIB) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMenu}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 animate-fade-in space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <h3 className="text-lg font-black text-emerald-950">
                {editingItem ? 'Edit Menu' : 'Tambah Menu Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload Foto Menu: Integrasi Kamera Langsung (capture="environment") & Galeri */}
            <div>
              <label className="block text-xs font-bold text-emerald-900 mb-1.5 flex items-center justify-between">
                <span>Foto Menu</span>
                {isProcessingImage && <span className="text-emerald-600 animate-pulse text-[11px]">Memproses foto...</span>}
              </label>

              {/* Input File Galeri */}
              <input
                type="file"
                ref={fileInputGalleryRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Input File Kamera Langsung HTML5 (capture="environment") */}
              <input
                type="file"
                ref={fileInputCameraRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {formData.image ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-200 bg-stone-50 h-36 group">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputCameraRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white text-stone-800 text-xs font-bold flex items-center gap-1 shadow-md"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputGalleryRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white text-stone-800 text-xs font-bold flex items-center gap-1 shadow-md"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Galeri</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="p-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {/* Tombol Jepret Kamera Langsung */}
                  <button
                    type="button"
                    onClick={() => fileInputCameraRef.current?.click()}
                    className="border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 rounded-2xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold text-emerald-950">Jepret Kamera</span>
                    <span className="text-[10px] text-stone-500">Buka kamera HP</span>
                  </button>

                  {/* Tombol Pilih dari Galeri */}
                  <button
                    type="button"
                    onClick={() => fileInputGalleryRef.current?.click()}
                    className="border-2 border-dashed border-stone-200 hover:border-emerald-400 bg-stone-50/60 hover:bg-stone-50 rounded-2xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center"
                  >
                    <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center mb-1.5">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold text-stone-900">Pilih Galeri</span>
                    <span className="text-[10px] text-stone-500">Unggah berkas foto</span>
                  </button>
                </div>
              )}
            </div>

            {/* Nama Produk */}
            <div>
              <label className="block text-xs font-bold text-emerald-900 mb-1">
                Nama Produk <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Ayam Geprek Sambal Matah"
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
              />
            </div>

            {/* Kategori Menu (WAJIB PILIH DROPDOWN SELECT) & Harga Jual */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  Kategori Menu <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-emerald-950"
                >
                  <option value="Makanan">Makanan</option>
                  <option value="Minuman">Minuman</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  Harga Jual (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="25000"
                  className="w-full px-3 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold"
                />
              </div>
            </div>

            {/* Status Visibilitas */}
            <div>
              <label className="block text-xs font-bold text-emerald-900 mb-1">Status Visibilitas</label>
              <div className="grid grid-cols-3 gap-2">
                {['Tersedia', 'Habis', 'Sembunyikan'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: st }))}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      formData.status === st
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessingImage}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm shadow-md shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                Simpan ke Kategori {formData.category}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
