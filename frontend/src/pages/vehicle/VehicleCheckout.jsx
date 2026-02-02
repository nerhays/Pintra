import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp, collection, addDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { compressImageToBase64 } from "../../utils/compressImageToBase64";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";
import "./VehicleCheckout.css";

function VehicleCheckout() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form
  const [kondisi, setKondisi] = useState("Baik");
  const [odometerAwal, setOdometerAwal] = useState("");
  const [sisaBBM, setSisaBBM] = useState("50-75%");
  const [kelengkapan, setKelengkapan] = useState("Lengkap");

  const [kelengkapanItems, setKelengkapanItems] = useState({
    dongkrak: true,
    p3k: true,
    segitiga: true,
  });

  const [uraianKelengkapan, setUraianKelengkapan] = useState("");
  const [uraianKondisi, setUraianKondisi] = useState("");

  // ✅ multi foto
  const [fotoBase64List, setFotoBase64List] = useState([]);

  // ✅ NEW: Location tracking
  const [locationPermission, setLocationPermission] = useState(null); // null, 'granted', 'denied'
  const [currentLocation, setCurrentLocation] = useState(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const ref = doc(db, "vehicle_bookings", bookingId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setData({ id: snap.id, ...snap.data() });
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // ✅ CEK PERMISSION GEOLOCATION SAAT MOUNT
  useEffect(() => {
    if (navigator.geolocation) {
      // Test permission
      navigator.permissions?.query({ name: "geolocation" }).then((result) => {
        setLocationPermission(result.state);
      });
    } else {
      alert("⚠️ Browser Anda tidak mendukung Geolocation. Tracking tidak akan aktif.");
    }
  }, []);

  // ✅ REQUEST LOCATION PERMISSION & GET CURRENT LOCATION
  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak support Geolocation");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setCurrentLocation(loc);
        setLocationPermission("granted");

        alert("✅ Lokasi berhasil diambil! Tracking akan aktif saat peminjaman dimulai.");
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationPermission("denied");

        let message = "Tidak bisa mendapatkan lokasi. ";
        if (error.code === 1) {
          message += "Anda menolak akses lokasi. Mohon izinkan akses lokasi di pengaturan browser.";
        } else if (error.code === 2) {
          message += "Lokasi tidak tersedia.";
        } else {
          message += "Timeout.";
        }

        alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  // ✅ convert file -> pure base64 string
  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const base64Arr = [];

      for (const f of files) {
        const result = await compressImageToBase64(f, {
          maxWidth: 1280,
          maxHeight: 720,
          quality: 0.7,
          mimeType: "image/jpeg",
        });

        if (result?.pureBase64) {
          base64Arr.push(result.pureBase64);
        }
      }

      setFotoBase64List((prev) => [...prev, ...base64Arr]);
      e.target.value = "";
    } catch (err) {
      console.error(err);
      alert("Gagal membaca / compress foto!");
    }
  };

  const removePhoto = (index) => {
    setFotoBase64List((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleItem = (key) => {
    setKelengkapanItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sanitizeForFirestore = (value) => {
    if (value === undefined) return null;
    if (typeof value === "number" && Number.isNaN(value)) return null;

    if (value instanceof Timestamp) return value;

    if (Array.isArray(value)) {
      return value.map((v) => sanitizeForFirestore(v)).filter((v) => v !== null);
    }

    if (value && typeof value === "object") {
      const cleaned = {};
      Object.entries(value).forEach(([k, v]) => {
        const cv = sanitizeForFirestore(v);
        if (cv !== null) cleaned[k] = cv;
      });
      return cleaned;
    }

    return value;
  };

  const submitCheckout = async () => {
    if (!auth.currentUser) {
      alert("Harus login");
      return;
    }

    if (!data) {
      alert("Data booking tidak ditemukan");
      return;
    }

    if (data.status !== "APPROVED") {
      alert("Checkout hanya bisa dilakukan jika status APPROVED");
      return;
    }

    const odo = Number(odometerAwal);
    if (!odometerAwal || Number.isNaN(odo)) {
      alert("Odometer awal wajib angka");
      return;
    }

    if (fotoBase64List.length === 0) {
      alert("Minimal upload 1 foto kondisi awal!");
      return;
    }

    // ✅ VALIDASI LOKASI
    if (locationPermission !== "granted" || !currentLocation) {
      const confirm = window.confirm("⚠️ Tracking lokasi belum aktif. Lanjutkan tanpa tracking?\n\n" + "Klik 'Cancel' untuk mengaktifkan tracking lokasi terlebih dahulu.");

      if (!confirm) return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const now = Timestamp.now();
      const ref = doc(db, "vehicle_bookings", bookingId);

      const rawKondisiAwal = {
        filledBy: auth.currentUser.uid,
        filledByName: data.namaPeminjam || data.emailPeminjam || "-",
        fotoBase64List: fotoBase64List,
        fotoTimestamp: now,
        kelengkapan: kelengkapan,
        kelengkapanItems: kelengkapanItems,
        kondisi: kondisi,
        odometerAwal: odo,
        sisaBBM: sisaBBM,
        timestamp: now,
        uraianKelengkapan: uraianKelengkapan?.trim() || "-",
        uraianKondisi: uraianKondisi?.trim() || "-",
      };

      const payloadKondisiAwal = sanitizeForFirestore(rawKondisiAwal);

      // ✅ UPDATE BOOKING WITH TRACKING INFO
      await updateDoc(ref, {
        kondisiAwal: payloadKondisiAwal,
        actualPickupTime: now,
        status: "ON_GOING",
        updatedAt: now,

        // ✅ TRACKING INFO
        tracking: {
          enabled: locationPermission === "granted",
          startLocation: currentLocation || null,
          lastLocation: currentLocation || null,
          lastUpdated: now,
        },
      });

      await addDoc(collection(db, "vehicle_bookings", bookingId, "approval_history"), {
        action: "VEHICLE_CHECKOUT",
        actionBy: data.namaPeminjam || data.emailPeminjam || "-",
        oldStatus: "APPROVED",
        newStatus: "ON_GOING",
        note: "Kendaraan diambil & kondisi awal dicatat",
        timestamp: now,
        userId: auth.currentUser.uid,
        odometerAwal: odo,
        sisaBBM: sisaBBM,
      });

      alert("✅ Berhasil checkout. Status jadi ON_GOING\n\n" + (locationPermission === "granted" ? "📍 Tracking lokasi AKTIF. Mohon jaga HP tetap online selama perjalanan." : "⚠️ Tracking lokasi TIDAK AKTIF."));

      // ✅ REDIRECT KE TRACKING PAGE (bukan riwayat)
      navigate(`/vehicle/tracking/${bookingId}`);
    } catch (err) {
      console.error(err);
      alert("❌ Gagal checkout: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40 }}>Booking tidak ditemukan</div>;

  return (
    <>
      <Navbar />

      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto", paddingTop: 110 }}>
        <button onClick={() => navigate(`/riwayat/kendaraan/${bookingId}`)} style={{ marginBottom: 20 }}>
          ← Kembali
        </button>

        <h2>TAHAP 2 — Check Kendaraan (Ambil Kunci)</h2>
        <p>
          Kendaraan: <b>{data.vehicle?.nama || "-"}</b> • <b>{data.vehicle?.platNomor || "-"}</b>
        </p>

        {/* ✅ LOCATION PERMISSION BOX */}
        <div
          style={{
            background: locationPermission === "granted" ? "#d4edda" : "#fff3cd",
            border: `1px solid ${locationPermission === "granted" ? "#c3e6cb" : "#ffc107"}`,
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0" }}>📍 Tracking Lokasi Real-Time</h4>

          {locationPermission === null && <p style={{ margin: 0 }}>Mengecek permission...</p>}

          {locationPermission === "granted" && currentLocation && (
            <>
              <p style={{ margin: 0, color: "#155724" }}>
                ✅ <strong>Tracking AKTIF</strong>
              </p>
              <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#155724" }}>
                Lokasi saat ini: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
              <a href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#007bff" }}>
                🗺️ Lihat di Maps
              </a>
            </>
          )}

          {locationPermission !== "granted" && (
            <>
              <p style={{ margin: "0 0 12px 0", color: "#856404" }}>⚠️ Tracking lokasi belum aktif. Klik tombol di bawah untuk mengaktifkan.</p>
              <button
                onClick={requestLocationPermission}
                style={{
                  padding: "10px 20px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                📍 Aktifkan Tracking Lokasi
              </button>
              <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#666" }}>
                <strong>Penting:</strong> Tracking lokasi diperlukan agar admin dapat memantau perjalanan kendaraan secara real-time. Mohon izinkan akses lokasi saat browser meminta permission.
              </p>
            </>
          )}
        </div>

        <div className="checkout-card">
          <div className="form-group">
            <label>Kondisi Kendaraan</label>
            <select value={kondisi} onChange={(e) => setKondisi(e.target.value)}>
              <option value="Baik">Baik</option>
              <option value="Tidak Baik">Tidak Baik</option>
            </select>
          </div>

          <div className="form-group">
            <label>Odometer Awal</label>
            <input type="number" value={odometerAwal} onChange={(e) => setOdometerAwal(e.target.value)} placeholder="contoh: 6000" />
          </div>

          <div className="form-group">
            <label>Sisa BBM (Awal)</label>
            <select value={sisaBBM} onChange={(e) => setSisaBBM(e.target.value)}>
              <option value="0-25%">0-25%</option>
              <option value="25-50%">25-50%</option>
              <option value="50-75%">50-75%</option>
              <option value="75-100%">75-100%</option>
            </select>
          </div>

          <div className="form-group">
            <label>Kelengkapan</label>
            <select value={kelengkapan} onChange={(e) => setKelengkapan(e.target.value)}>
              <option value="Lengkap">Lengkap</option>
              <option value="Tidak Lengkap">Tidak Lengkap</option>
            </select>
          </div>

          <div className="form-group">
            <label>Checklist Kelengkapan</label>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label>
                <input type="checkbox" checked={kelengkapanItems.dongkrak} onChange={() => toggleItem("dongkrak")} /> Dongkrak
              </label>
              <label>
                <input type="checkbox" checked={kelengkapanItems.p3k} onChange={() => toggleItem("p3k")} /> P3K
              </label>
              <label>
                <input type="checkbox" checked={kelengkapanItems.segitiga} onChange={() => toggleItem("segitiga")} /> Segitiga
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Uraian Kelengkapan (opsional)</label>
            <textarea value={uraianKelengkapan} onChange={(e) => setUraianKelengkapan(e.target.value)} placeholder="contoh: Kotak P3K hilang" />
          </div>

          <div className="form-group">
            <label>Uraian Kondisi (opsional)</label>
            <textarea value={uraianKondisi} onChange={(e) => setUraianKondisi(e.target.value)} placeholder="contoh: Ada lecet bumper belakang" />
          </div>

          <div className="form-group">
            <label>Foto Kondisi Kendaraan (WAJIB, bisa banyak)</label>
            <input type="file" accept="image/*" multiple onChange={handlePhotoChange} />

            {fotoBase64List.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ color: "green" }}>✅ {fotoBase64List.length} foto tersimpan</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {fotoBase64List.map((_, idx) => (
                    <button key={idx} type="button" onClick={() => removePhoto(idx)} style={{ padding: "4px 10px" }}>
                      Hapus Foto #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            disabled={saving}
            onClick={submitCheckout}
            style={{
              marginTop: 10,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "⏳ Menyimpan..." : "✅ Simpan & Mulai Peminjaman"}
          </button>
        </div>
      </div>
      <FooterOrnament />
      <Footer />
    </>
  );
}

export default VehicleCheckout;
