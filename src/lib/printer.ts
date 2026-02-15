export interface ThermalPrinterDevice {
  id: string;
  name: string;
  address?: string;
}

type ThermalPrinterPlugin = {
  requestPermissions?: () => Promise<void>;
  discover?: () => Promise<{ devices: ThermalPrinterDevice[] }>;
  getPairedDevices?: () => Promise<{ devices: ThermalPrinterDevice[] }>;
  printEscPos?: (options: { printerId: string; payload: string }) => Promise<void>;
};

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  Plugins?: {
    ThermalPrinter?: ThermalPrinterPlugin;
  };
};

const STORAGE_KEY = 'preferred-thermal-printer';

const getBridge = (): CapacitorBridge | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor || null;
};

const getPlugin = () => {
  const bridge = getBridge();
  if (!bridge?.isNativePlatform?.()) {
    return null;
  }

  return bridge.Plugins?.ThermalPrinter || null;
};

export const isNativeThermalPrinterReady = () => {
  const plugin = getPlugin();
  return Boolean(plugin?.printEscPos);
};

export const getSavedThermalPrinter = (): ThermalPrinterDevice | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ThermalPrinterDevice;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const saveThermalPrinter = (device: ThermalPrinterDevice) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(device));
};

export const clearSavedThermalPrinter = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
};

export const discoverThermalPrinters = async (): Promise<ThermalPrinterDevice[]> => {
  const plugin = getPlugin();
  if (!plugin) {
    throw new Error('Fitur scan printer hanya tersedia di aplikasi Android (native container).');
  }

  await plugin.requestPermissions?.();
  const discovery = await plugin.discover?.();
  if (discovery?.devices?.length) {
    return discovery.devices;
  }

  const paired = await plugin.getPairedDevices?.();
  return paired?.devices || [];
};

export const printToSavedThermalPrinter = async (payload: string): Promise<boolean> => {
  const plugin = getPlugin();
  if (!plugin?.printEscPos) {
    return false;
  }

  const savedPrinter = getSavedThermalPrinter();
  if (!savedPrinter) {
    return false;
  }

  await plugin.printEscPos({
    printerId: savedPrinter.id,
    payload,
  });

  return true;
};

const right = (left: string, rightValue: string) => {
  const width = 32;
  const available = Math.max(0, width - rightValue.length);
  return `${left.slice(0, available)}${' '.repeat(Math.max(1, width - left.length - rightValue.length))}${rightValue}`;
};

export const buildEscPosTransactionPayload = (lines: {
  companyName: string;
  phone: string;
  trxCode: string;
  dateTime: string;
  category: string;
  vehicle: string;
  plateNumber: string;
  total: string;
}) => {
  return [
    '[C]'+lines.companyName,
    lines.phone,
    '--------------------------------',
    right('No', lines.trxCode),
    right('Waktu', lines.dateTime),
    right('Kategori', lines.category),
    right('Kendaraan', lines.vehicle),
    right('Nopol', lines.plateNumber),
    '--------------------------------',
    right('TOTAL', lines.total),
    '',
    '[C]Terima kasih',
    '[CUT]',
  ].join('\n');
};

export const buildEscPosMembershipPayload = (lines: {
  companyName: string;
  phone: string;
  trxCode: string;
  dateTime: string;
  tier: string;
  duration: string;
  total: string;
}) => {
  return [
    '[C]'+lines.companyName,
    lines.phone,
    '--------------------------------',
    right('No', lines.trxCode),
    right('Waktu', lines.dateTime),
    right('Paket', lines.tier),
    right('Durasi', lines.duration),
    '--------------------------------',
    right('TOTAL', lines.total),
    '',
    '[C]Terima kasih',
    '[CUT]',
  ].join('\n');
};
