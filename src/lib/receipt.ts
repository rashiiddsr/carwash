import { CompanyProfile, Membership, Transaction, Vehicle } from '../types';
import { formatCurrency } from './utils';
import { getMembershipTier } from './membership';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const resolveLogoUrl = (logoPath: string | null | undefined) => {
  if (!logoPath) {
    return null;
  }

  if (logoPath.startsWith('http')) {
    return logoPath;
  }

  if (!API_BASE_URL) {
    return logoPath;
  }

  return new URL(logoPath, API_BASE_URL).toString();
};

const buildReceiptHtml = (title: string, body: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page { size: 58mm auto; margin: 0; }
      * { box-sizing: border-box; }
      html, body { width: 58mm; margin: 0; padding: 0; }
      body {
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.25;
        color: #111;
        padding: 2mm;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .center { text-align: center; }
      .line { border-top: 1px dashed #444; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .row span:first-child { flex: 0 0 auto; }
      .row span:last-child { flex: 1; text-align: right; word-break: break-word; }
      .bold { font-weight: 700; }
      .muted { color: #444; }
      img { max-width: 36mm; max-height: 20mm; object-fit: contain; margin-bottom: 4px; }
      .small { font-size: 12px; }
      .wifi-info { margin-top: 2px; }
      .wifi-info .label { font-weight: 700; }
    </style>
  </head>
  <body>${body}</body>
</html>`;

const printWithIframe = (html: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');

  let hasPrinted = false;
  const cleanup = () => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  };

  iframe.onload = () => {
    if (hasPrinted) {
      return;
    }

    hasPrinted = true;
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }

    frameWindow.addEventListener('afterprint', cleanup, { once: true });
    frameWindow.focus();
    setTimeout(() => {
      frameWindow.print();
    }, 150);
    setTimeout(() => {
      cleanup();
    }, 3000);
  };

  document.body.appendChild(iframe);
  const frameDocument = iframe.contentDocument;
  if (!frameDocument) {
    document.body.removeChild(iframe);
    throw new Error('Gagal menyiapkan iframe untuk cetak struk.');
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
};

const openReceiptWindow = (title: string, body: string) => {
  const html = buildReceiptHtml(title, body);

  try {
    printWithIframe(html);
    return;
  } catch {
    // fallback ke popup jika iframe print gagal
  }

  const popup = window.open('', '_blank', 'noopener,noreferrer,width=420,height=720');
  if (!popup) {
    throw new Error('Browser memblokir popup/print. Izinkan popup atau print otomatis untuk mencetak struk.');
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();

  setTimeout(() => {
    popup.print();
    popup.close();
  }, 300);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildCompanyHeader = (company: CompanyProfile, fallbackName: string) => {
  const logoUrl = resolveLogoUrl(company.logo_path);
  return `
    <div class="center">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
      <div class="bold">${escapeHtml(company.company_name || fallbackName)}</div>
      <div>${escapeHtml(company.address || '-')}</div>
      <div>${escapeHtml(company.phone || '-')}</div>
    </div>
    <div class="line"></div>
  `;
};

const buildWifiInfo = () => `
  <div class="center small wifi-info">
    <div><span class="label">Nama Wifi:</span> Royal Carwash</div>
    <div><span class="label">Password:</span> royalbersih</div>
  </div>
`;

export const printTransactionReceipt = ({
  transaction,
  company,
}: {
  transaction: Transaction;
  company: CompanyProfile;
}) => {
  const createdAt = new Date(transaction.created_at).toLocaleString('id-ID');
  const body = `
    ${buildCompanyHeader(company, 'Carwash POS')}
    <div class="row"><span>ID</span><span class="bold">${escapeHtml(transaction.transaction_code)}</span></div>
    <div class="row"><span>Tanggal</span><span>${escapeHtml(createdAt)}</span></div>
    <div class="row"><span>Kasir</span><span>${escapeHtml(transaction.employee?.name || '-')}</span></div>
    <div class="line"></div>
    <div class="row"><span>Kategori</span><span>${escapeHtml(transaction.category?.name || '-')}</span></div>
    <div class="row"><span>Kendaraan</span><span>${escapeHtml(transaction.car_brand)}</span></div>
    <div class="row"><span>Nopol</span><span>${escapeHtml(transaction.plate_number)}</span></div>
    <div class="row"><span>Customer</span><span>${escapeHtml(transaction.customer?.name || 'Umum')}</span></div>
    <div class="line"></div>
    <div class="row"><span>Harga Dasar</span><span>${formatCurrency(transaction.base_price || transaction.price)}</span></div>
    <div class="row"><span>Diskon</span><span>${formatCurrency(transaction.discount_amount || 0)}</span></div>
    <div class="row bold"><span>Total</span><span>${formatCurrency(transaction.price)}</span></div>
    <div class="line"></div>
    ${buildWifiInfo()}
    <div class="center small">Terima kasih sudah menggunakan layanan kami.</div>
  `;

  openReceiptWindow(`Struk ${transaction.transaction_code}`, body);
};

export const printMembershipReceipt = ({
  membership,
  company,
  vehicle,
  customerName,
}: {
  membership: Membership;
  company: CompanyProfile;
  vehicle?: Vehicle;
  customerName?: string;
}) => {
  const tier = getMembershipTier(membership.tier);
  const createdAt = new Date(membership.created_at).toLocaleString('id-ID');
  const body = `
    ${buildCompanyHeader(company, 'Carwash POS')}
    <div class="row"><span>ID</span><span class="bold">${escapeHtml(membership.transaction_code)}</span></div>
    <div class="row"><span>Tanggal</span><span>${escapeHtml(createdAt)}</span></div>
    <div class="line"></div>
    <div class="row"><span>Paket</span><span>${escapeHtml(tier.label)}</span></div>
    <div class="row"><span>Durasi</span><span>${membership.duration_months} bulan</span></div>
    <div class="row"><span>Aktif</span><span>${escapeHtml(membership.starts_at)}</span></div>
    <div class="row"><span>Expired</span><span>${escapeHtml(membership.ends_at)}</span></div>
    <div class="row"><span>Customer</span><span>${escapeHtml(customerName || '-')}</span></div>
    <div class="row"><span>Kendaraan</span><span>${escapeHtml(vehicle ? `${vehicle.car_brand} (${vehicle.plate_number})` : '-')}</span></div>
    <div class="line"></div>
    <div class="row bold"><span>Total Bayar</span><span>${formatCurrency(membership.total_price || 0)}</span></div>
    <div class="line"></div>
    ${buildWifiInfo()}
    <div class="center small">Struk membership premium.</div>
  `;

  openReceiptWindow(`Struk ${membership.transaction_code}`, body);
};
