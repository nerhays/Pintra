import "./BannerPopup.css";

function BannerPopup({ open, bannerData, onClose }) {
  if (!open) return null;
  if (!bannerData) return null;

  const { imageBase64, imageUrl } = bannerData;

  let imageSrc = "";

  if (imageUrl) {
    imageSrc = imageUrl;
  } else if (imageBase64) {
    imageSrc = `data:image/jpeg;base64,${imageBase64}`;
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div
        className="popup-card"
        onClick={(e) => e.stopPropagation()} // klik banner tetap aman
      >
        {imageSrc && (
          <img
            src={imageSrc}
            alt="Banner Pengumuman"
            className="popup-banner-img"
            onError={(e) => {
              console.log("❌ Gambar gagal load:", imageSrc);
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>
    </div>
  );
}

export default BannerPopup;
