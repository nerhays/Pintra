import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, updateDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

function VehicleTracking() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "vehicle_bookings", bookingId), (snap) => {
      if (snap.exists()) {
        setData({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [bookingId]);

  // ✅ MANUAL UPDATE LOCATION
  const updateLocation = () => {
    if (updating) return;

    setUpdating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || 0,
          };

          await updateDoc(doc(db, "vehicle_bookings", bookingId), {
            "tracking.lastLocation": location,
            "tracking.lastUpdated": Timestamp.now(),
          });

          alert("✅ Lokasi berhasil diupdate!");
        } catch (err) {
          alert("❌ Gagal update: " + err.message);
        } finally {
          setUpdating(false);
        }
      },
      (error) => {
        alert("❌ Tidak bisa mendapatkan lokasi. Pastikan GPS aktif.");
        setUpdating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40 }}>Booking tidak ditemukan</div>;

  const lastLocation = data.tracking?.lastLocation;
  const lastUpdated = data.tracking?.lastUpdated?.toDate();
  const now = new Date();
  const minutesSinceUpdate = lastUpdated ? Math.floor((now - lastUpdated) / 60000) : 999;

  return (
    <>
      <Navbar />

      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto", paddingTop: 110 }}>
        <button onClick={() => navigate(`/riwayat/kendaraan/${bookingId}`)}>← Kembali</button>

        <h2>🚗 Tracking Kendaraan</h2>
        <p>
          <b>{data.vehicle?.nama}</b> • <b>{data.vehicle?.platNomor}</b>
        </p>

        {/* BIG UPDATE BUTTON */}
        <div
          style={{
            background: minutesSinceUpdate > 30 ? "#fff3cd" : "#d4edda",
            border: `2px solid ${minutesSinceUpdate > 30 ? "#ffc107" : "#28a745"}`,
            padding: 20,
            borderRadius: 12,
            marginTop: 20,
            textAlign: "center",
          }}
        >
          {minutesSinceUpdate > 30 && (
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#856404",
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              ⚠️ Lokasi terakhir sudah {minutesSinceUpdate} menit yang lalu
            </p>
          )}

          <button
            onClick={updateLocation}
            disabled={updating}
            style={{
              padding: "16px 32px",
              background: updating ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 700,
              cursor: updating ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "all 0.3s",
              width: "100%",
              maxWidth: 400,
            }}
            onMouseEnter={(e) => !updating && (e.target.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => !updating && (e.target.style.transform = "translateY(0)")}
          >
            {updating ? "⏳ Mengambil Lokasi..." : "📍 UPDATE LOKASI SEKARANG"}
          </button>

          <p
            style={{
              margin: "12px 0 0 0",
              fontSize: 14,
              color: "#666",
            }}
          >
            Klik tombol ini setiap 15-30 menit untuk update lokasi
          </p>
        </div>

        {/* LAST LOCATION */}
        {lastLocation && (
          <div
            style={{
              background: "white",
              border: "1px solid #e0e0e0",
              padding: 20,
              borderRadius: 12,
              marginTop: 20,
            }}
          >
            <h4 style={{ margin: "0 0 16px 0" }}>📍 Lokasi Terakhir</h4>

            <p style={{ margin: "0 0 8px 0" }}>
              <strong>Koordinat:</strong>
              <br />
              {lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)}
            </p>

            {lastUpdated && (
              <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#666" }}>
                <strong>Diperbarui:</strong> {lastUpdated.toLocaleString("id-ID")}
                <br />
                <span style={{ color: minutesSinceUpdate > 30 ? "#d9534f" : "#5cb85c" }}>({minutesSinceUpdate} menit yang lalu)</span>
              </p>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a
                href={`https://www.google.com/maps?q=${lastLocation.lat},${lastLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: "12px 20px",
                  background: "#007bff",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                🗺️ Lihat di Maps
              </a>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lastLocation.lat},${lastLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: "12px 20px",
                  background: "#28a745",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  textAlign: "center",
                }}
              >
                🧭 Navigasi
              </a>
            </div>
          </div>
        )}

        {/* INFO */}
        <div
          style={{
            background: "#e7f3ff",
            border: "1px solid #b3d9ff",
            padding: 16,
            borderRadius: 8,
            marginTop: 20,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0" }}>ℹ️ Panduan Tracking</h4>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>
              <strong>Update lokasi setiap 15-30 menit</strong> selama perjalanan
            </li>
            <li>Pastikan GPS HP aktif</li>
            <li>Koneksi internet diperlukan untuk update</li>
            <li>Admin dapat memantau lokasi terbaru Anda</li>
            <li>
              <strong>Penting:</strong> Simpan halaman ini di bookmark untuk akses cepat
            </li>
          </ul>
        </div>

        {/* DETAIL */}
        <div style={{ marginTop: 20, padding: 16, background: "#f8f9fa", borderRadius: 8 }}>
          <h4>📋 Detail Perjalanan</h4>
          <p>
            <strong>Tujuan:</strong> {data.tujuan}
          </p>
          <p>
            <strong>Waktu Kembali:</strong> {data.waktuKembali?.toDate().toLocaleString("id-ID")}
          </p>
          <p>
            <strong>Odometer Awal:</strong> {data.kondisiAwal?.odometerAwal || "-"} km
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default VehicleTracking;
