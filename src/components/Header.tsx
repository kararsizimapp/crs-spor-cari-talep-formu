import React from 'react';
import { History, FileText, PlusCircle } from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onNewRecord: () => void;
  onOpenHistory?: () => void;
  savedCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onNewRecord,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center border border-sky-400/30">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white">CRS SPOR</span>
            </div>
            <p className="text-xs text-slate-400 hidden lg:block">
              Tedarikçi / Cari Hesap Açma Talep Formu Oluşturucu
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* New Record Button */}
          <button
            onClick={onNewRecord}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold transition-all shadow-md shadow-emerald-900/20 border border-emerald-400/30 active:scale-95"
            title="Sıfırla ve Yeni İşlem Başlat"
          >
            <PlusCircle className="w-4 h-4 text-emerald-100" />
            <span>Yeni Kayıt</span>
          </button>
        </div>
      </div>
    </header>
  );
};
