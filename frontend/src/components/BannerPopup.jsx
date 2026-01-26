import "./BannerPopup.css";

function BannerPopup({ open, bannerData, onClose }) {
  if (!open) return null;
  if (!bannerData) return null;

  const { title, message, imageBase64, imageUrl } = bannerData;

  // ✅ prioritas:
  // 1) imageUrl (kalau pakai hosting/storage)
  // 2) imageBase64 (kalau simpan base64)
  let imageSrc = "";

  if (imageUrl) {
    imageSrc = imageUrl;
  } else if (imageBase64) {
    // ✅ kalau base64 kamu simpan "pure", wajib tambahin prefix
    // default: jpeg (paling umum)
    imageSrc = `data:image/jpeg;base64,${imageBase64}`;
  }

  return (
    <div className="popup-overlay">
      <div className="popup-card">
        <div className="popup-header">
          <h2>{title || "Pengumuman"}</h2>

          <button className="popup-close" onClick={onClose}>
            ✖
          </button>
        </div>

        {/* ✅ GAMBAR */}
        {imageSrc && (
          <img
            src={imageSrc}
            alt="Banner"
            className="popup-banner-img"
            onError={(e) => {
              console.log("❌ Gambar gagal load:", imageSrc);
              e.currentTarget.style.display = "none";
            }}
          />
        )}

        {/* ✅ PESAN */}
        {message && <p className="popup-message">{message}</p>}

        <div className="popup-footer">
          <button className="popup-btn" onClick={onClose}>
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

export default BannerPopup;
