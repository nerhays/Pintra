import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import VehicleCard from "../../components/VehicleCard";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./VehicleBooking.css";

function VehicleBooking() {
  const [keyword, setKeyword] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [role, setRole] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [searched, setSearched] = useState(false);

  // ✅ NEW: tracking user sudah booking hari ini atau belum
  const [userHasBookedToday, setUserHasBookedToday] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);

  // ✅ FETCH ROLE (SEKALI SAAT LOAD)
  useEffect(() => {
    const fetchRole = async () => {
      if (!auth.currentUser) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setRole(snapshot.docs[0].data().role);
      }
    };

    fetchRole();
  }, []);

  // ✅ NEW: CEK APAKAH USER SUDAH BOOKING HARI INI
  const checkUserBookingToday = async (startDateTime) => {
    if (!auth.currentUser || !startDateTime) {
      setUserHasBookedToday(false);
      return false;
    }

    setLoadingCheck(true);

    try {
      const selectedDate = new Date(startDateTime).toISOString().split("T")[0];

      const q = query(collection(db, "vehicle_bookings"), where("peminjamId", "==", auth.currentUser.uid));

      const snap = await getDocs(q);

      const hasBookingToday = snap.docs.some((doc) => {
        const data = doc.data();

        // Hanya cek booking yang masih aktif
        const activeStatuses = ["APPROVAL_1", "APPROVAL_2", "APPROVAL_3", "APPROVED", "ON_GOING"];
        if (!activeStatuses.includes(data.status)) return false;

        const bookingStart = data.waktuPinjam?.toDate?.();
        if (!bookingStart) return false;

        const bookingDate = bookingStart.toISOString().split("T")[0];
        return bookingDate === selectedDate;
      });

      setUserHasBookedToday(hasBookingToday);
      setLoadingCheck(false);

      return hasBookingToday;
    } catch (err) {
      console.error("Error checking user booking:", err);
      setLoadingCheck(false);
      return false;
    }
  };

  // ✅ NEW: VALIDASI WAKTU TIDAK BOLEH LEWAT
  const validateDateTime = (startDateTime, endDateTime) => {
    const now = new Date();
    const userStart = new Date(startDateTime);
    const userEnd = new Date(endDateTime);

    // Validasi 1: End harus lebih besar dari start
    if (userEnd <= userStart) {
      alert("❌ Waktu selesai harus lebih besar dari waktu mulai");
      return false;
    }

    // Validasi 2: Tidak boleh pilih waktu yang sudah lewat
    if (userStart <= now) {
      alert("❌ Tidak bisa booking waktu yang sudah lewat. Pilih waktu di masa depan.");
      return false;
    }

    return true;
  };

  // 🔍 SEARCH KENDARAAN
  const handleSearch = async () => {
    if (!startDateTime || !endDateTime) {
      alert("❌ Tanggal & jam wajib diisi");
      return;
    }

    // ✅ VALIDASI WAKTU
    if (!validateDateTime(startDateTime, endDateTime)) {
      return;
    }

    // ✅ CEK USER SUDAH BOOKING HARI INI
    const hasBooked = await checkUserBookingToday(startDateTime);

    if (hasBooked) {
      alert("⚠️ Anda sudah memiliki booking kendaraan aktif untuk tanggal ini. Hanya boleh 1 booking per hari.");
      setVehicles([]);
      setSearched(true);
      return;
    }

    const userStart = new Date(startDateTime);
    const userEnd = new Date(endDateTime);

    // 1️⃣ Ambil semua kendaraan
    const vehicleSnap = await getDocs(collection(db, "vehicles"));
    const allVehiclesRaw = vehicleSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // ✅ hanya kendaraan aktif yang boleh dibooking
    const allVehicles = allVehiclesRaw.filter((v) => v.statusAktif === true);

    // 2️⃣ Ambil semua booking kendaraan
    const bookingSnap = await getDocs(collection(db, "vehicle_bookings"));
    const bookings = bookingSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // 3️⃣ Filter kendaraan tersedia (tidak bentrok)
    const availableVehicles = allVehicles.filter((vehicle) => {
      const BLOCKING_STATUS = ["APPROVAL_1", "APPROVAL_2", "APPROVAL_3", "APPROVED", "ON_GOING"];

      const relatedBookings = bookings.filter((b) => b.vehicle?.vehicleId === vehicle.id && BLOCKING_STATUS.includes(b.status));

      for (const booking of relatedBookings) {
        const bStart = booking.waktuPinjam?.toDate?.();
        const bEnd = booking.waktuKembali?.toDate?.();

        if (!bStart || !bEnd) continue;

        // ✅ overlap check
        const isOverlap = userStart < bEnd && userEnd > bStart;
        if (isOverlap) return false;
      }

      return true;
    });

    // 4️⃣ Filter keyword
    const filtered = availableVehicles.filter((v) => `${v.nama || ""} ${v.platNomor || ""}`.toLowerCase().includes(keyword.toLowerCase()));

    setVehicles(filtered);
    setSearched(true);
  };

  // ✅ GET MIN DATETIME (sekarang + 1 menit)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // Minimal 1 menit dari sekarang
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  };

  return (
    <>
      <Navbar role={role} />

      <div className="vehicle-container">
        <h2 className="vehicle-title">Peminjaman Kendaraan</h2>

        <div className="vehicle-filter">
          <input type="text" placeholder="Cari kendaraan..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />

          <input
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            min={getMinDateTime()} // ✅ tidak bisa pilih waktu yang sudah lewat
          />

          <span className="to">Sampai</span>

          <input
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            min={startDateTime || getMinDateTime()} // ✅ end harus >= start
          />

          <button onClick={handleSearch} disabled={loadingCheck}>
            {loadingCheck ? "Mengecek..." : "Search"}
          </button>
        </div>

        {/* ✅ WARNING JIKA USER SUDAH BOOKING HARI INI */}
        {userHasBookedToday && searched && (
          <div
            style={{
              background: "#fff3cd",
              border: "1px solid #ffc107",
              padding: "16px 20px",
              borderRadius: 8,
              marginTop: 20,
              color: "#856404",
              textAlign: "center",
            }}
          >
            <strong>⚠️ Perhatian:</strong> Anda sudah memiliki booking kendaraan aktif untuk tanggal ini.
            <br />
            Sistem hanya mengizinkan 1 booking per hari.
          </div>
        )}

        {/* ✅ LOADING INDICATOR */}
        {loadingCheck && (
          <div
            style={{
              textAlign: "center",
              padding: 20,
              color: "#666",
              background: "#f8f9fa",
              borderRadius: 8,
              marginTop: 20,
            }}
          >
            <p>⏳ Mengecek ketersediaan...</p>
          </div>
        )}

        {/* ✅ HASIL PENCARIAN */}
        {searched && !loadingCheck && (
          <div className="vehicle-list">
            {vehicles.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  background: userHasBookedToday ? "#fff3cd" : "#f8d7da",
                  border: userHasBookedToday ? "1px solid #ffc107" : "1px solid #f5c2c7",
                  borderRadius: 8,
                  color: userHasBookedToday ? "#856404" : "#842029",
                  marginTop: 20,
                }}
              >
                <strong style={{ fontSize: 18 }}>{userHasBookedToday ? "⚠️ Tidak dapat menampilkan kendaraan" : "❌ Tidak ada kendaraan tersedia"}</strong>
                <p style={{ margin: "12px 0 0 0", fontSize: 14 }}>
                  {userHasBookedToday ? "Anda sudah memiliki booking untuk tanggal ini. Batalkan booking yang ada atau pilih tanggal lain." : "Semua kendaraan sedang digunakan atau tidak aktif untuk waktu yang dipilih."}
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    background: "#d1e7dd",
                    border: "1px solid #badbcc",
                    padding: "12px 16px",
                    borderRadius: 8,
                    marginBottom: 20,
                    color: "#0f5132",
                    textAlign: "center",
                  }}
                >
                  ✅ Ditemukan <strong>{vehicles.length}</strong> kendaraan tersedia
                </div>
                {vehicles.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} start={startDateTime} end={endDateTime} />
                ))}
              </>
            )}
          </div>
        )}

        {/* ✅ INFO AWAL (SEBELUM SEARCH) */}
        {!searched && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#666",
              background: "#f8f9fa",
              borderRadius: 8,
              marginTop: 40,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
            <p style={{ fontSize: 16, margin: 0 }}>Pilih tanggal & waktu untuk melihat kendaraan yang tersedia</p>
          </div>
        )}
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default VehicleBooking;
