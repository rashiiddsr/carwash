const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const resolveCompanyAssetUrl = (assetPath?: string | null) => {
  if (!assetPath) return null;
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }

  if (!API_BASE_URL) {
    return assetPath;
  }

  return new URL(assetPath, API_BASE_URL).toString();
};
