export type MembershipTierKey =
  | 'BASIC'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM_VIP';

export type MembershipTier = {
  key: MembershipTierKey;
  label: string;
  price: number;
  description: string;
  highlights: string[];
  note?: string;
};

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    key: 'BASIC',
    label: 'Basic',
    price: 0,
    description: 'Default untuk setiap mobil',
    highlights: ['8x cuci gratis 1x cuci reguler', 'Mendapatkan 1 poin setiap cuci'],
  },
  {
    key: 'BRONZE',
    label: 'Bronze',
    price: 29000,
    description: 'Hemat untuk pelanggan aktif',
    highlights: [
      'Diskon 5% semua layanan',
      '8x cuci gratis 1x cuci',
      'Mendapatkan 1 poin setiap cuci',
      'Gratis pengecekan oli, air radiator & air wiper',
    ],
  },
  {
    key: 'SILVER',
    label: 'Silver',
    price: 49000,
    description: 'Benefit rutin tiap bulan',
    highlights: [
      'Diskon 10% semua layanan',
      'Gratis cuci 1x per bulan',
      'Mendapatkan 1.5 poin setiap cuci',
      'Gratis pengecekan oli, air radiator & air wiper',
    ],
  },
  {
    key: 'GOLD',
    label: 'Gold',
    price: 149000,
    description: 'Lebih banyak layanan premium',
    highlights: [
      'Diskon 15% semua layanan',
      'Gratis cuci 4x per bulan',
      'Mendapatkan 2.5 poin setiap cuci',
      'Garansi 24 jam (cuci ulang ringan) kalau kehujanan*',
      'Gratis antar jemput',
      'Gratis pengecekan oli, air radiator & air wiper',
    ],
  },
  {
    key: 'PLATINUM_VIP',
    label: 'Platinum VIP',
    price: 249000,
    description: 'Prioritas layanan & benefit tertinggi',
    highlights: [
      'Diskon 20% semua layanan',
      'Gratis 5x cuci per bulan',
      'Mendapatkan 3 poin setiap cuci',
      'Garansi 24 jam (cuci ulang ringan) kalau kehujanan*',
      'Gratis antar jemput',
      'Prioritas Lane 1 Hydrolik (reservasi 1 jam sebelumnya)',
      'Gratis pengecekan oli, air radiator & air wiper',
    ],
    note: 'Penambahan kendaraan dalam 1 akun membership Platinum VIP dikenakan biaya Rp149.000.',
  },
];

export const EXTRA_VEHICLE_PLATINUM_FEE = 149000;

export const getMembershipTier = (key: MembershipTierKey) =>
  MEMBERSHIP_TIERS.find((tier) => tier.key === key) ?? MEMBERSHIP_TIERS[0];
