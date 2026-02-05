import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";
import RoomCard from "../../components/RoomCard";

import "./RoomBooking.css";

// ================= CONFIG =================
const BUFFER_HOURS = 2;

// ================= COMPONENT =================
function RoomBooking() {
  const navigate = useNavigate();

  const [allRooms, setAllRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [role, setRole] = useState(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");

  const [userHasBookedToday, setUserHasBookedToday] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [searched, setSearched] = useState(false);

  // ================= FETCH ROOMS & ROLE =================
  useEffect(() => {
    const fetchData = async () => {
      // role
      if (auth.currentUser) {
        const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
        const snap = await getDocs(q);
        if (!snap.empty) setRole(snap.docs[0].data().role);
      }

      // rooms
      const snapRooms = await getDocs(collection(db, "rooms"));

      const allRoomsData = snapRooms.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const onlyAvailableRooms = allRoomsData.filter((r) => r.status === "available");

      setAllRooms(onlyAvailableRooms);
    };

    fetchData();
  }, []);

  // ✅ CEK APAKAH USER SUDAH BOOKING HARI INI
  const checkUserBookingToday = async (date) => {
    if (!auth.currentUser || !date) {
      setUserHasBookedToday(false);
      return false;
    }

    setLoadingCheck(true);

    try {
      const q = query(collection(db, "room_bookings"), where("peminjam.userId", "==", auth.currentUser.uid));

      const snap = await getDocs(q);

      const hasBookingToday = snap.docs.some((doc) => {
        const data = doc.data();

        const activeStatuses = ["WAITING_MANAGER", "WAITING_OPERATOR", "WAITING_ADMIN", "APPROVED", "ON_GOING"];
        if (!activeStatuses.includes(data.status)) return false;

        const bookingStart = data.waktuMulai?.toDate?.();
        if (!bookingStart) return false;

        const bookingDate = bookingStart.toISOString().split("T")[0];
        return bookingDate === date;
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

  // ✅ GET MIN TIME untuk jam mulai
  const getMinTime = () => {
    if (!selectedDate) return "08:00";

    const today = new Date().toISOString().split("T")[0];

    // Kalau bukan hari ini, minimal jam 08:00
    if (selectedDate !== today) return "08:00";

    // Kalau hari ini, minimal 1 menit dari sekarang
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes() + 1).padStart(2, "0");

    // Jika sudah lewat jam 17:00, tidak bisa booking hari ini
    if (now.getHours() >= 17) {
      return "17:00";
    }

    return `${hours}:${minutes}`;
  };

  // ✅ VALIDASI WAKTU
  const validateDateTime = (date, startTime, endTime) => {
    const now = new Date();
    const userStart = new Date(`${date}T${startTime}`);
    const userEnd = new Date(`${date}T${endTime}`);

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

    // Validasi 3: Maksimal jam 17:00
    const maxTime = new Date(`${date}T17:00`);
    if (userEnd > maxTime) {
      alert("❌ Waktu selesai maksimal jam 17:00");
      return false;
    }

    // Validasi 4: Minimal jam 08:00
    const minTime = new Date(`${date}T08:00`);
    if (userStart < minTime) {
      alert("❌ Waktu mulai minimal jam 08:00");
      return false;
    }

    return true;
  };

  // 🔍 SEARCH RUANGAN TERSEDIA
  const handleSearch = async () => {
    if (!selectedDate || !jamMulai || !jamSelesai) {
      alert("❌ Tanggal & jam wajib diisi");
      return;
    }

    // ✅ VALIDASI WAKTU
    if (!validateDateTime(selectedDate, jamMulai, jamSelesai)) {
      return;
    }

    // ✅ CEK USER SUDAH BOOKING HARI INI
    const hasBooked = await checkUserBookingToday(selectedDate);

    if (hasBooked) {
      alert("⚠️ Anda sudah memiliki booking ruangan aktif untuk tanggal ini. Hanya boleh 1 booking per hari.");
      setAvailableRooms([]);
      setSearched(true);
      return;
    }

    const userStart = new Date(`${selectedDate}T${jamMulai}`);
    const userEnd = new Date(`${selectedDate}T${jamSelesai}`);

    // 1️⃣ Ambil semua booking ruangan
    const bookingSnap = await getDocs(collection(db, "room_bookings"));
    const bookings = bookingSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // 2️⃣ Filter ruangan tersedia (tidak bentrok)
    const available = allRooms.filter((room) => {
      const BLOCKING_STATUS = ["WAITING_MANAGER", "WAITING_OPERATOR", "WAITING_ADMIN", "APPROVED", "ON_GOING"];

      const relatedBookings = bookings.filter((b) => b.ruang?.roomId === room.id && BLOCKING_STATUS.includes(b.status));

      for (const booking of relatedBookings) {
        const bStart = booking.waktuMulai?.toDate?.();
        const bEnd = booking.waktuSelesai?.toDate?.();

        if (!bStart || !bEnd) continue;

        // Apply buffer
        const bufferMs = BUFFER_HOURS * 60 * 60 * 1000;

        const bookingStartWithBuffer = new Date(bStart.getTime() - bufferMs);
        const bookingEndWithBuffer = new Date(bEnd.getTime() + bufferMs);

        // ❗ OVERLAP TOTAL (AMAN)
        const isOverlap = userStart < bookingEndWithBuffer && userEnd > bookingStartWithBuffer;

        if (isOverlap) return false;
      }

      return true;
    });

    setAvailableRooms(available);
    setSearched(true);
  };

  // ================= UI =================
  return (
    <>
      <Navbar role={role} />

      <div className="room-container">
        <h2 className="room-title">Peminjaman Ruang</h2>

        {/* FILTER */}
        <div className="room-filter">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />

          <input type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} min={getMinTime()} max="17:00" disabled={!selectedDate} />

          <span className="to">Sampai</span>

          <input type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} min={jamMulai || getMinTime()} max="17:00" disabled={!jamMulai} />

          <button onClick={handleSearch} disabled={loadingCheck}>
            {loadingCheck ? "Mengecek..." : "Search"}
          </button>
        </div>

        {/* ✅ WARNING JIKA USER SUDAH BOOKING HARI INI */}
        {userHasBookedToday && searched && (
          <div className="room-warning">
            <strong>⚠️ Perhatian:</strong> Anda sudah memiliki booking aktif untuk tanggal ini.
            <br />
            Sistem hanya mengizinkan 1 booking per hari.
          </div>
        )}

        {/* ✅ LOADING INDICATOR */}
        {loadingCheck && (
          <div className="room-loading">
            <p>⏳ Mengecek ketersediaan...</p>
          </div>
        )}

        {/* ✅ HASIL PENCARIAN */}
        {searched && !loadingCheck && (
          <>
            {/* ✅ ALERT FULL WIDTH */}
            {availableRooms.length > 0 && (
              <div className="room-alert">
                ✅ Ditemukan <strong>{availableRooms.length}</strong> ruangan tersedia
              </div>
            )}

            {/* ✅ GRID CARD */}
            <div className="room-list">
              {availableRooms.length === 0 ? <div className="room-empty">❌ Tidak ada ruangan tersedia</div> : availableRooms.map((room) => <RoomCard key={room.id} room={room} date={selectedDate} start={jamMulai} end={jamSelesai} />)}
            </div>
          </>
        )}

        {/* ✅ INFO AWAL (SEBELUM SEARCH) */}
        {!searched && (
          <div className="room-info">
            <div className="room-info-icon">🏢</div>
            <p>Pilih tanggal & waktu untuk melihat ruangan yang tersedia</p>
          </div>
        )}
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default RoomBooking;
