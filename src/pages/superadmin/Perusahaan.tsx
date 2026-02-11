import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Phone, Image } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../hooks/useToast';

export function Perusahaan() {
  const { showSuccess, showError, ToastComponent } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const { data: companyProfile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => api.company.get(),
  });

  useEffect(() => {
    if (!companyProfile) return;
    setCompanyName(companyProfile.company_name);
    setAddress(companyProfile.address);
    setPhone(companyProfile.phone);
    setLogoUrl(companyProfile.logo_url ?? '');
  }, [companyProfile]);

  const updateMutation = useMutation({
    mutationFn: () => api.company.update({
      company_name: companyName,
      address,
      phone,
      logo_url: logoUrl || null,
    }),
    onSuccess: () => {
      showSuccess('Data perusahaan berhasil diperbarui');
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : 'Gagal memperbarui data perusahaan');
    },
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!companyName.trim() || !address.trim() || !phone.trim()) {
      showError('Nama perusahaan, alamat, dan nomor hp wajib diisi');
      return;
    }

    await updateMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Perusahaan</h1>
        <p className="text-gray-600 mt-1">Ubah profil perusahaan dan simpan ke database</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Memuat data perusahaan...
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Nama Perusahaan
          </label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Alamat
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Nomor HP
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Image className="w-4 h-4" />
            Logo URL
          </label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        {logoUrl && (
          <div className="border rounded-lg p-3 w-fit">
            <img src={logoUrl} alt="Preview logo" className="h-20 object-contain" />
          </div>
        )}

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>
    </div>
  );
}
