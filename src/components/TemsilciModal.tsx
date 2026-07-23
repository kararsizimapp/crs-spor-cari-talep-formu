import React, { useState, useEffect } from 'react';
import { X, UserCheck, Plus, Check, Shield, User, Trash2, Edit2, Save } from 'lucide-react';
import { AppSettings } from '../types';
import { DEFAULT_REPRESENTATIVES } from '../utils/initialFormData';

interface TemsilciModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSelectTemsilci: (selectedTemsilci: string, updatedList?: string[]) => void;
}

export const TemsilciModal: React.FC<TemsilciModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSelectTemsilci,
}) => {
  const [newTemsilciName, setNewTemsilciName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [temsilciList, setTemsilciList] = useState<string[]>(
    settings.temsilciler && settings.temsilciler.length > 0
      ? settings.temsilciler
      : DEFAULT_REPRESENTATIVES
  );

  useEffect(() => {
    if (settings.temsilciler && settings.temsilciler.length > 0) {
      setTemsilciList(settings.temsilciler);
    } else {
      setTemsilciList(DEFAULT_REPRESENTATIVES);
    }
  }, [settings.temsilciler, isOpen]);

  if (!isOpen) return null;

  const handleSelect = (name: string) => {
    onSelectTemsilci(name, temsilciList);
    onClose();
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTemsilciName.trim();
    if (!trimmed) return;

    let updated = temsilciList;
    if (!temsilciList.includes(trimmed)) {
      updated = [...temsilciList, trimmed];
      setTemsilciList(updated);
    }
    onSelectTemsilci(trimmed, updated);
    setNewTemsilciName('');
    onClose();
  };

  const handleDelete = (indexToDelete: number, nameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (temsilciList.length <= 1) {
      alert('Listede en az 1 temsilci kalmalıdır.');
      return;
    }
    const updated = temsilciList.filter((_, idx) => idx !== indexToDelete);
    setTemsilciList(updated);
    
    let nextActive = settings.temsilci;
    if (settings.temsilci === nameToDelete) {
      nextActive = updated[0];
    }
    onSelectTemsilci(nextActive, updated);
  };

  const startEdit = (index: number, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const saveEdit = (index: number, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const trimmed = editingName.trim();
    if (!trimmed) return;

    const oldName = temsilciList[index];
    const updated = [...temsilciList];
    updated[index] = trimmed;
    setTemsilciList(updated);
    setEditingIndex(null);

    let nextActive = settings.temsilci;
    if (settings.temsilci === oldName) {
      nextActive = trimmed;
    }
    onSelectTemsilci(nextActive, updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="bg-sky-500/20 p-2 rounded-lg border border-sky-500/30 text-sky-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Temsilci Listesi & Değiştirme</h3>
              <p className="text-[11px] text-slate-400">Aktif temsilciyi seçin veya yeni temsilci ekleyin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Currently Active Representative */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sky-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-sky-800 tracking-wider uppercase block">
                  Seçili Temsilci
                </span>
                <span className="text-sm font-extrabold text-slate-900">
                  {settings.temsilci || 'Mustafa Can'}
                </span>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" /> Aktif
            </span>
          </div>

          {/* Quick Representative Switcher List */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Sistemdeki Temsilciler ({temsilciList.length})
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
              {temsilciList.map((name, index) => {
                const isActive = settings.temsilci === name;
                const isEditing = editingIndex === index;

                if (isEditing) {
                  return (
                    <form
                      key={index}
                      onSubmit={(e) => saveEdit(index, e)}
                      className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-300"
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-amber-400 focus:border-amber-600 outline-none bg-white text-slate-900"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => saveEdit(index, e)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm"
                        title="Kaydet"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="bg-slate-200 text-slate-700 p-1.5 rounded-lg hover:bg-slate-300"
                        title="İptal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  );
                }

                return (
                  <div
                    key={name}
                    onClick={() => handleSelect(name)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md font-bold'
                        : 'bg-slate-50 hover:bg-sky-50/80 text-slate-800 border-slate-200 hover:border-sky-300 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                      <Shield className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold truncate">{name}</span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isActive && (
                        <span className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full font-bold mr-1">
                          Seçili
                        </span>
                      )}
                      
                      <button
                        type="button"
                        onClick={(e) => startEdit(index, name, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                            : 'text-slate-400 hover:text-sky-600 hover:bg-sky-100'
                        }`}
                        title="Temsilci Adını Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(index, name, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'text-rose-300 hover:text-rose-100 hover:bg-rose-900/40'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-100'
                        }`}
                        title="Temsilciyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Representative */}
          <form onSubmit={handleAddNew} className="pt-3 border-t border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Yeni Temsilci Ekle:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTemsilciName}
                onChange={(e) => setNewTemsilciName(e.target.value)}
                placeholder="Örn: Mustafa Can"
                className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 focus:border-sky-500 font-bold outline-none"
              />
              <button
                type="submit"
                disabled={!newTemsilciName.trim()}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-1 transition-all shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ekle</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
