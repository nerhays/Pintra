import { useState } from "react";
import "./BannerPopup.css";

function BannerPopup({ open, bannerData, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!open) return null;
  if (!bannerData) return null;

  // ✅ Support both old (single) and new (multiple) format
  const banners = bannerData.banners || [];

  if (banners.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const currentBanner = banners[currentIndex];
  let imageSrc = "";

  if (currentBanner.imageUrl) {
    imageSrc = currentBanner.imageUrl;
  } else if (currentBanner.imageBase64) {
    imageSrc = `data:image/jpeg;base64,${currentBanner.imageBase64}`;
  }

  const showNavigation = banners.length > 1;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        {imageSrc && (
          <>
            <img
              src={imageSrc}
              alt={currentBanner.title || "Banner Pengumuman"}
              className="popup-banner-img"
              onError={(e) => {
                console.log("❌ Gambar gagal load:", imageSrc);
                e.currentTarget.style.display = "none";
              }}
            />

            {/* ✅ Navigation arrows */}
            {showNavigation && (
              <>
                <button
                  className="popup-nav popup-nav-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  aria-label="Previous banner"
                >
                  ‹
                </button>
                <button
                  className="popup-nav popup-nav-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  aria-label="Next banner"
                >
                  ›
                </button>
              </>
            )}

            {/* ✅ Dots indicator */}
            {showNavigation && (
              <div className="popup-dots">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    className={`popup-dot ${index === currentIndex ? "active" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(index);
                    }}
                    aria-label={`Go to banner ${index + 1}`}
                  />
                ))}
              </div>
            )}

            {/* ✅ Close button */}
            <button className="popup-close-btn" onClick={onClose} aria-label="Close banner">
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default BannerPopup;
