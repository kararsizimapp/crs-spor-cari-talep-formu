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
  settings,
  onNewRecord,
  onOpenHistory,
  savedCount,
}) => {
  return (
    <header className="bg-slate-950 text-white border-b border-red-900/30 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-gradient-to-br from-red-600 via-red-700 to-rose-800 p-2.5 rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center border border-red-500/40">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-tight text-white">CRS <span className="text-red-500">SPOR</span></span>
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
            className="flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs sm:text-sm px-4 py-2 rounded-xl font-bold transition-all shadow-md shadow-red-950/40 border border-red-400/30 active:scale-95"
            title="Sıfırla ve Yeni İşlem Başlat"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Yeni Kayıt</span>
          </button>
        </div>
      </div>
    </header>
  );
};
