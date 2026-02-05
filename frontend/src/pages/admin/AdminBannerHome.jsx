import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";

import AdminLayout from "../../components/admin/AdminLayout";
import { compressImageToBase64 } from "../../utils/compressImageToBase64";

import "./AdminBannerHome.css";

function AdminBannerHome() {
  const [role, setRole] = useState(null);
  const [isActive, setIsActive] = useState(true);

  // ✅ Array untuk menyimpan multiple banners
  const [banners, setBanners] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRole = async () => {
    try {
      if (!auth.currentUser) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setRole(snap.docs[0].data().role);
      } else {
        setRole("user");
      }
    } catch (err) {
      console.error(err);
      setRole("user");
    }
  };

  const fetchBanner = async () => {
    try {
      const refDoc = doc(db, "app_settings", "home_banner");
      const snap = await getDoc(refDoc);

      if (snap.exists()) {
        const d = snap.data();
        setIsActive(d.isActive ?? true);

        // ✅ Load banners array
        const loadedBanners = d.banners || [];

        // Convert to preview format
        const bannersWithPreview = loadedBanners.map((banner) => ({
          ...banner,
          previewUrl: banner.imageBase64 ? `data:image/jpeg;base64,${banner.imageBase64}` : "",
        }));

        setBanners(bannersWithPreview);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Gagal mengambil banner!");
    }
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await fetchRole();
      await fetchBanner();
      setLoading(false);
    };
    run();
  }, []);

  // ✅ Tambah banner baru
  const addNewBanner = () => {
    setBanners([
      ...banners,
      {
        id: Date.now(), // temporary ID
        title: "Banner " + (banners.length + 1),
        imageBase64: "",
        previewUrl: "",
      },
    ]);
  };

  // ✅ Hapus banner
  const removeBanner = (index) => {
    if (banners.length <= 1) {
      alert("⚠️ Minimal harus ada 1 banner!");
      return;
    }

    const confirmed = window.confirm("Hapus banner ini?");
    if (confirmed) {
      setBanners(banners.filter((_, i) => i !== index));
    }
  };

  // ✅ Update title banner
  const updateBannerTitle = (index, newTitle) => {
    const updated = [...banners];
    updated[index].title = newTitle;
    setBanners(updated);
  };

  // ✅ Update image banner
  const handleImageChange = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await compressImageToBase64(file, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.7,
        mimeType: "image/jpeg",
      });

      const limitBytes = 950000;
      if (result.approxSizeBytes > limitBytes) {
        alert(`❌ Gambar masih terlalu besar setelah compress.\n` + `Ukuran: ${(result.approxSizeBytes / 1024).toFixed(1)} KB\n` + `Coba pakai gambar lebih kecil / turunkan quality.`);
        return;
      }

      const updated = [...banners];
      updated[index].imageBase64 = result.pureBase64;
      updated[index].previewUrl = result.dataUrl;
      setBanners(updated);

      e.target.value = "";
    } catch (err) {
      console.error(err);
      alert("❌ Gagal memproses gambar: " + err.message);
    }
  };

  // ✅ Pindah posisi banner (up/down)
  const moveBanner = (index, direction) => {
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= banners.length) return;

    const updated = [...banners];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setBanners(updated);
  };

  const saveBanner = async () => {
    if (!auth.currentUser) {
      alert("Harus login");
      return;
    }

    if (!(role === "admin" || role === "operator")) {
      alert("Tidak punya akses");
      return;
    }

    // ✅ Validasi semua banner harus punya gambar
    const emptyBanners = banners.filter((b) => !b.imageBase64);
    if (emptyBanners.length > 0) {
      alert("❌ Semua banner wajib diupload gambar!");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const now = Timestamp.now();
      const refDoc = doc(db, "app_settings", "home_banner");

      // ✅ Simpan array banners (tanpa previewUrl)
      const bannersToSave = banners.map(({ previewUrl, ...rest }) => rest);

      await setDoc(refDoc, {
        isActive,
        banners: bannersToSave,
        updatedAt: now,
        updatedBy: auth.currentUser.uid,
      });

      alert("✅ Banner berhasil disimpan!");
    } catch (err) {
      console.error(err);
      alert("❌ Gagal menyimpan banner: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-banner-page">
        <div className="admin-banner-header">
          <h2>Kelola Popup Banner Home</h2>
          <p>Admin / Operator bisa mengganti banner popup yang muncul di halaman Home.</p>
        </div>

        {loading ? (
          <div className="admin-banner-loading">Loading...</div>
        ) : (
          <div className="admin-banner-card">
            <label className="admin-banner-checkbox">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Aktifkan Popup Banner
            </label>

            <div className="admin-banner-controls">
              <button className="admin-banner-add-btn" onClick={addNewBanner}>
                ➕ Tambah Banner
              </button>
              <small>Total: {banners.length} banner</small>
            </div>

            {/* ✅ List semua banner */}
            <div className="admin-banner-list">
              {banners.map((banner, index) => (
                <div key={banner.id || index} className="admin-banner-item">
                  <div className="admin-banner-item-header">
                    <span className="banner-number">Banner #{index + 1}</span>

                    <div className="banner-actions">
                      {index > 0 && (
                        <button className="btn-move" onClick={() => moveBanner(index, "up")} title="Pindah ke atas">
                          ⬆️
                        </button>
                      )}
                      {index < banners.length - 1 && (
                        <button className="btn-move" onClick={() => moveBanner(index, "down")} title="Pindah ke bawah">
                          ⬇️
                        </button>
                      )}
                      <button className="btn-remove" onClick={() => removeBanner(index)} title="Hapus banner">
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="admin-banner-form">
                    <div className="admin-banner-group">
                      <label>Judul Banner (opsional)</label>
                      <input type="text" value={banner.title || ""} onChange={(e) => updateBannerTitle(index, e.target.value)} placeholder="Contoh: Promo Spesial" />
                    </div>

                    <div className="admin-banner-group">
                      <label>Upload Gambar Banner</label>
                      <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, index)} />
                      <small>*Gambar otomatis resize + compress supaya masuk limit Firestore.</small>
                    </div>

                    {banner.previewUrl && (
                      <div className="admin-banner-preview">
                        <p>✅ Preview Banner</p>
                        <img src={banner.previewUrl} alt={`preview-${index}`} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="admin-banner-btn" onClick={saveBanner} disabled={saving}>
              {saving ? "Menyimpan..." : "💾 Simpan Semua Banner"}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminBannerHome;
