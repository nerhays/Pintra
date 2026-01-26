import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { compressImageToBase64 } from "../../utils/compressImageToBase64";

function AdminBannerHome() {
  const [role, setRole] = useState(null);

  const [isActive, setIsActive] = useState(true);
  const [title, setTitle] = useState("Pengumuman");
  const [message, setMessage] = useState("");

  // ✅ simpan base64 di firestore (bukan storage)
  const [imageBase64, setImageBase64] = useState("");

  // preview
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

        // preview kalau sudah ada base64
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
      // ✅ compress otomatis
      const result = await compressImageToBase64(file, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.7,
        mimeType: "image/jpeg",
      });

      // ✅ cek size hasil base64
      const limitBytes = 950000; // aman < 1,048,487
      if (result.approxSizeBytes > limitBytes) {
        alert(`❌ Gambar masih terlalu besar setelah compress.\n` + `Ukuran: ${(result.approxSizeBytes / 1024).toFixed(1)} KB\n` + `Coba pakai gambar lebih kecil atau turunkan kualitas compress.`);
        return;
      }

      setImageBase64(result.pureBase64);
      setPreviewUrl(result.dataUrl);

      alert(`✅ Gambar berhasil dikompres!\n` + `Ukuran approx: ${(result.approxSizeBytes / 1024).toFixed(1)} KB\n` + `Dimensi: ${result.width}x${result.height}`);

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
        imageBase64: imageBase64,
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

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <>
      <Navbar role={role} />

      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
        <h2>Kelola Popup Banner Home</h2>

        <div style={{ marginTop: 16, background: "#fff", padding: 16, borderRadius: 12 }}>
          <label style={{ display: "block", marginBottom: 12 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Aktifkan Popup Banner
          </label>

          <div style={{ marginBottom: 12 }}>
            <label>Judul</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6 }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Pesan</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} style={{ width: "100%", padding: 10, marginTop: 6, minHeight: 90 }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Upload Banner (Auto Compress ke Base64)</label>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginTop: 6 }} />
            <small style={{ display: "block", marginTop: 6, color: "#6b7280" }}>*Gambar akan otomatis resize + compress agar muat di Firestore (limit 1MB).</small>
          </div>

          {previewUrl && (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: "green" }}>✅ Preview Banner</p>
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  width: "100%",
                  maxHeight: 250,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
            </div>
          )}

          <button
            onClick={saveBanner}
            disabled={saving}
            style={{
              marginTop: 16,
              padding: 12,
              width: "100%",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Menyimpan..." : "✅ Simpan Banner"}
          </button>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default AdminBannerHome;
