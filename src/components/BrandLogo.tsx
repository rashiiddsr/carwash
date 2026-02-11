import { Car } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { resolveCompanyAssetUrl } from '../lib/company';

interface BrandLogoProps {
  sizeClassName?: string;
  iconClassName?: string;
  textClassName?: string;
  subtitle?: string;
}

export function BrandLogo({
  sizeClassName = 'w-12 h-12',
  iconClassName = 'w-7 h-7',
  textClassName = 'font-bold text-lg text-gray-900',
  subtitle,
}: BrandLogoProps) {
  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile-brand'],
    queryFn: () => api.company.get(),
    retry: 0,
  });

  const logoSrc = resolveCompanyAssetUrl(companyProfile?.logo_path);
  const companyName = companyProfile?.company_name || 'Royal Carwash';

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClassName} bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden`}>
        {logoSrc ? (
          <img src={logoSrc} alt={companyName} className="w-full h-full object-cover" />
        ) : (
          <Car className={`${iconClassName} text-white`} />
        )}
      </div>
      <div>
        <h1 className={textClassName}>{companyName}</h1>
        {subtitle ? <p className="text-xs text-gray-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}
