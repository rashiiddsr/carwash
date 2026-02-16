import { PrinterSetupPanel } from '../../components/printer/PrinterSetupPanel';
import { useToast } from '../../hooks/useToast';

export function PrinterThermal() {
  const { showSuccess, showError, ToastComponent } = useToast();

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Printer Thermal 58mm</h1>
        <p className="text-gray-600 mt-1">
          Atur printer thermal default untuk cetak struk transaksi dan membership.
        </p>
      </div>

      <PrinterSetupPanel onSuccess={showSuccess} onError={showError} />
    </div>
  );
}
