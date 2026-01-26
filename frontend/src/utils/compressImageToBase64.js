// src/utils/compressImageToBase64.js
export const compressImageToBase64 = (file, options = {}) => {
  const {
    maxWidth = 1280,
    maxHeight = 720,
    quality = 0.7, // 0.1 - 1.0 (semakin kecil semakin compress)
    mimeType = "image/jpeg", // banner paling aman jpeg
  } = options;

  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("File tidak ditemukan"));

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // resize proporsional
        let { width, height } = img;

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // hasil base64
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // hapus prefix data:image/...;base64,
        const pureBase64 = dataUrl.split(",")[1];

        resolve({
          pureBase64,
          dataUrl, // untuk preview
          width,
          height,
          mimeType,
          approxSizeBytes: Math.floor((pureBase64.length * 3) / 4),
        });
      };

      img.onerror = () => reject(new Error("Gagal memproses gambar"));
      img.src = reader.result;
    };

    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsDataURL(file);
  });
};
