import { useState } from 'react';
import {
  clearSavedThermalPrinter,
  discoverThermalPrinters,
  getSavedThermalPrinter,
  isNativeThermalPrinterReady,
  saveThermalPrinter,
  ThermalPrinterDevice,
} from '../../lib/printer';

interface PrinterSetupPanelProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function PrinterSetupPanel({ onSuccess, onError }: PrinterSetupPanelProps) {
  const [devices, setDevices] = useState<ThermalPrinterDevice[]>([]);
  const [selectedId, setSelectedId] = useState(getSavedThermalPrinter()?.id || '');
  const [savedPrinter, setSavedPrinter] = useState<ThermalPrinterDevice | null>(getSavedThermalPrinter());
  const [loading, setLoading] = useState(false);

  const isNative = isNativeThermalPrinterReady();

  const handleScan = async () => {
    if (!isNative) {
      onError('Mode web/PWA belum bisa scan printer Bluetooth Classic. Jalankan via Android native container.');
      return;
    }

    try {
      setLoading(true);
      const found = await discoverThermalPrinters();
      setDevices(found);
      if (!found.length) {
        onError('Printer tidak ditemukan. Pastikan printer aktif dan sudah pairing di Android.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Gagal scan printer.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const selected = devices.find((device) => device.id === selectedId);
    if (!selected) {
      onError('Pilih printer terlebih dahulu.');
      return;
    }

    saveThermalPrinter(selected);
    setSavedPrinter(selected);
    onSuccess(`Printer tersimpan: ${selected.name}`);
  };

  const handleClear = () => {
    clearSavedThermalPrinter();
    setSavedPrinter(null);
    setSelectedId('');
    onSuccess('Printer default dihapus.');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-gray-900">Printer Thermal 58mm</h3>
        <p className="text-sm text-gray-600">
          Pilih printer default untuk mode Android native. Jika belum native, sistem tetap fallback ke dialog print browser.
        </p>
      </div>

      <div className="text-xs text-gray-600">
        Status native: <span className={isNative ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>{isNative ? 'Terdeteksi' : 'Belum aktif'}</span>
      </div>

      {savedPrinter && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Printer aktif: {savedPrinter.name} ({savedPrinter.id})
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleScan}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Scanning...' : 'Scan Printer'}
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
        >
          Simpan Printer Default
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium"
        >
          Hapus Default
        </button>
      </div>

      {devices.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Daftar printer</label>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="">Pilih printer</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} - {device.id}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
