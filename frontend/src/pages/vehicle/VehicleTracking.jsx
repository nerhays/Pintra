import { useEffect, useState, useRef } from "react";
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

  // ✅ NEW: Auto tracking state
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const watchIdRef = useRef(null);

  // Real-time listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "vehicle_bookings", bookingId), (snap) => {
      if (snap.exists()) {
        const bookingData = { id: snap.id, ...snap.data() };
        setData(bookingData);

        // ✅ Auto-start tracking jika enabled
        if (bookingData.tracking?.enabled && !isAutoTracking) {
          startAutoTracking();
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [bookingId]);

  // ✅ CLEANUP: Stop tracking saat component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        console.log("🛑 Auto-tracking stopped (component unmount)");
      }
    };
  }, []);

  // ✅ AUTO TRACKING dengan watchPosition
  const startAutoTracking = () => {
    if (isAutoTracking) {
      console.log("⚠️ Auto-tracking sudah aktif");
      return;
    }

    if (!navigator.geolocation) {
      alert("Browser tidak support Geolocation");
      return;
    }

    console.log("🚀 Starting auto-tracking...");

    const watchId = navigator.geolocation.watchPosition(
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

          console.log("✅ Lokasi auto-updated:", location);
        } catch (err) {
          console.error("❌ Error updating location:", err);
        }
      },
      (error) => {
        console.error("❌ Geolocation error:", error);

        if (error.code === 1) {
          alert("⚠️ Akses lokasi ditolak. Auto-tracking dimatikan.");
          stopAutoTracking();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      },
    );

    watchIdRef.current = watchId;
    setIsAutoTracking(true);
    console.log("✅ Auto-tracking started, watchId:", watchId);
  };

  // ✅ STOP AUTO TRACKING
  const stopAutoTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsAutoTracking(false);
      console.log("🛑 Auto-tracking stopped");
    }
  };

  // ✅ MANUAL UPDATE (tetap ada sebagai backup)
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

        {/* ✅ AUTO TRACKING STATUS */}
        <div
          style={{
            background: isAutoTracking ? "#d4edda" : "#fff3cd",
            border: `2px solid ${isAutoTracking ? "#28a745" : "#ffc107"}`,
            padding: 16,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0" }}>{isAutoTracking ? "✅ Auto-Tracking AKTIF" : "⚠️ Auto-Tracking TIDAK AKTIF"}</h4>
          <p style={{ margin: "0 0 12px 0", fontSize: 14 }}>{isAutoTracking ? "Lokasi Anda akan terupdate otomatis setiap ada pergerakan" : "Lokasi hanya update manual. Klik tombol di bawah untuk aktifkan auto-tracking"}</p>

          {!isAutoTracking && (
            <button
              onClick={startAutoTracking}
              style={{
                padding: "10px 20px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🚀 Aktifkan Auto-Tracking
            </button>
          )}

          {isAutoTracking && (
            <button
              onClick={stopAutoTracking}
              style={{
                padding: "10px 20px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🛑 Matikan Auto-Tracking
            </button>
          )}
        </div>

        {/* MANUAL UPDATE BUTTON (backup) */}
        <div
          style={{
            background: minutesSinceUpdate > 30 ? "#fff3cd" : "#f8f9fa",
            border: `2px solid ${minutesSinceUpdate > 30 ? "#ffc107" : "#dee2e6"}`,
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
          >
            {updating ? "⏳ Mengambil Lokasi..." : "📍 UPDATE MANUAL"}
          </button>

          <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#666" }}>Gunakan tombol ini jika auto-tracking tidak berfungsi</p>
        </div>

        {/* REST OF YOUR CODE (LAST LOCATION, INFO, DETAIL) */}
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
                <span style={{ color: minutesSinceUpdate > 30 ? "#d9534f" : "#5cb85c" }}>({minutesSinceUpdate < 1 ? "Baru saja" : `${minutesSinceUpdate} menit yang lalu`})</span>
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

        {/* INFO & DETAIL sections remain the same */}
      </div>

      <Footer />
    </>
  );
}

export default VehicleTracking;
