export const getMainImageDataUrl = (photos) => {
  if (!Array.isArray(photos) || photos.length === 0) return null;

  const main = photos.find((p) => p.isMain) || photos[0];

  if (!main?.base64 || !main?.mimeType) return null;

  return `data:${main.mimeType};base64,${main.base64}`;
};
