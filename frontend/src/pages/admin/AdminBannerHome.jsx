import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";

import AdminLayout from "../../components/admin/AdminLayout";
import { compressImageToBase64 } from "../../utils/compressImageToBase64";

import "./AdminBannerHome.css";

function AdminBannerHome() {
  const [role, setRole] = useState(null);

  const [isActive, setIsActive] = useState(true);
  const [title, setTitle] = useState("Pengumuman");
  const [message, setMessage] = useState("");

  // ✅ simpan base64 di firestore
  const [imageBase64, setImageBase64] = useState("");

  // ✅ preview
  const [previewUrl, setPreviewUrl] = useState("");

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
        setTitle(d.title ?? "Pengumuman");
        setMessage(d.message ?? "");
        setImageBase64(d.imageBase64 ?? "");

        if (d.imageBase64) {
          setPreviewUrl(`data:image/jpeg;base64,${d.imageBase64}`);
        }
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

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await compressImageToBase64(file, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.7,
        mimeType: "image/jpeg",
      });

      const limitBytes = 950000; // aman < 1MB firestore
      if (result.approxSizeBytes > limitBytes) {
        alert(`❌ Gambar masih terlalu besar setelah compress.\n` + `Ukuran: ${(result.approxSizeBytes / 1024).toFixed(1)} KB\n` + `Coba pakai gambar lebih kecil / turunkan quality.`);
        return;
      }

      setImageBase64(result.pureBase64);
      setPreviewUrl(result.dataUrl);
      e.target.value = "";
    } catch (err) {
      console.error(err);
      alert("❌ Gagal memproses gambar: " + err.message);
    }
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

    if (!title.trim()) {
      alert("Judul banner wajib diisi");
      return;
    }

    if (!imageBase64) {
      alert("Gambar banner wajib diupload");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const now = Timestamp.now();
      const refDoc = doc(db, "app_settings", "home_banner");

      await setDoc(refDoc, {
        isActive,
        title: title.trim(),
        message: message.trim(),
        imageBase64,
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

            <div className="admin-banner-form">
              <div className="admin-banner-group">
                <label>Judul</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Pengumuman" />
              </div>

              <div className="admin-banner-group">
                <label>Pesan</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Contoh: Harap isi form sesuai prosedur" />
              </div>

              <div className="admin-banner-group">
                <label>Upload Banner (Auto Compress Base64)</label>
                <input type="file" accept="image/*" onChange={handleImageChange} />
                <small>*Gambar otomatis resize + compress supaya masuk limit Firestore.</small>
              </div>

              {previewUrl && (
                <div className="admin-banner-preview">
                  <p>✅ Preview Banner</p>
                  <img src={previewUrl} alt="preview" />
                </div>
              )}

              <button className="admin-banner-btn" onClick={saveBanner} disabled={saving}>
                {saving ? "Menyimpan..." : "✅ Simpan Banner"}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminBannerHome;
