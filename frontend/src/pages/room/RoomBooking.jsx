import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./RoomBooking.css";

// ================= CONFIG =================
const BUFFER_HOURS = 2;

// generate slot tiap 30 menit
function generateTimeSlots(start = "08:00", end = "17:00") {
  const slots = [];
  let [h, m] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  while (h < eh || (h === eh && m <= em)) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += 30;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots("08:00", "17:00");

// ================= COMPONENT =================
function RoomBooking() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [role, setRole] = useState(null);

  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [availableTimes, setAvailableTimes] = useState([]);
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");

  // ✅ NEW: tracking user sudah booking hari ini atau belum
  const [userHasBookedToday, setUserHasBookedToday] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);

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

      const allRooms = snapRooms.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const onlyAvailableRooms = allRooms.filter((r) => r.status === "available");

      setRooms(onlyAvailableRooms);
    };

    fetchData();
  }, []);

  // ✅ NEW: CEK APAKAH USER SUDAH BOOKING HARI INI
  const checkUserBookingToday = async (date) => {
    if (!auth.currentUser || !date) {
      setUserHasBookedToday(false);
      return;
    }

    setLoadingCheck(true);

    try {
      const q = query(collection(db, "room_bookings"), where("peminjam.userId", "==", auth.currentUser.uid));

      const snap = await getDocs(q);

      const hasBookingToday = snap.docs.some((doc) => {
        const data = doc.data();

        // Hanya cek booking yang masih aktif (bukan REJECTED/CANCELLED)
        const activeStatuses = ["WAITING_MANAGER", "WAITING_OPERATOR", "WAITING_ADMIN", "APPROVED"];
        if (!activeStatuses.includes(data.status)) return false;

        const bookingStart = data.waktuMulai?.toDate?.();
        if (!bookingStart) return false;

        const bookingDate = bookingStart.toISOString().split("T")[0];
        return bookingDate === date;
      });

      setUserHasBookedToday(hasBookingToday);

      if (hasBookingToday) {
        alert("⚠️ Anda sudah memiliki booking aktif untuk tanggal ini. Hanya boleh 1 booking per hari.");
      }
    } catch (err) {
      console.error("Error checking user booking:", err);
    } finally {
      setLoadingCheck(false);
    }
  };

  // ✅ NEW: FILTER JAM YANG SUDAH LEWAT (HANYA UNTUK HARI INI)
  const filterPastTimes = (slots, selectedDate) => {
    const today = new Date().toISOString().split("T")[0];

    // Kalau bukan hari ini, return semua slot
    if (selectedDate !== today) return slots;

    // Kalau hari ini, filter jam yang sudah lewat
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    return slots.filter((slot) => {
      const [hour, minute] = slot.split(":").map(Number);

      // Jam sudah lewat
      if (hour < currentHour) return false;

      // Jam sama tapi menit sudah lewat
      if (hour === currentHour && minute <= currentMinute) return false;

      return true;
    });
  };

  // ================= HITUNG JAM TERSEDIA =================
  const checkAvailability = async () => {
    if (!selectedRoom || !selectedDate) {
      setAvailableTimes([]);
      return;
    }

    // ✅ CEK USER SUDAH BOOKING HARI INI ATAU BELUM
    await checkUserBookingToday(selectedDate);

    const roomSelected = rooms.find((r) => r.id === selectedRoom);
    if (!roomSelected) {
      setSelectedRoom("");
      setAvailableTimes([]);
      alert("❌ Ruangan tidak tersedia / sudah nonaktif.");
      return;
    }

    const q = query(collection(db, "room_bookings"), where("ruang.roomId", "==", selectedRoom));
    const snap = await getDocs(q);

    let blockedSlots = new Set();

    snap.docs.forEach((doc) => {
      const data = doc.data();

      const blockedStatuses = ["WAITING_MANAGER", "WAITING_OPERATOR", "WAITING_ADMIN", "APPROVED"];
      if (!blockedStatuses.includes(data.status)) return;

      const start = data.waktuMulai?.toDate?.();
      const end = data.waktuSelesai?.toDate?.();
      if (!start || !end) return;

      const bookingDate = start.toISOString().split("T")[0];
      if (bookingDate !== selectedDate) return;

      const endWithBuffer = new Date(end.getTime() + BUFFER_HOURS * 60 * 60 * 1000);

      TIME_SLOTS.forEach((slot) => {
        const slotTime = new Date(`${selectedDate}T${slot}`);
        if (slotTime >= start && slotTime < endWithBuffer) {
          blockedSlots.add(slot);
        }
      });
    });

    let available = TIME_SLOTS.filter((slot) => !blockedSlots.has(slot));

    // ✅ FILTER JAM YANG SUDAH LEWAT (HANYA UNTUK HARI INI)
    available = filterPastTimes(available, selectedDate);

    setAvailableTimes(available);
  };

  useEffect(() => {
    checkAvailability();
    setJamMulai("");
    setJamSelesai("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, selectedDate]);

  function getValidEndTimes(jamMulai, availableTimes, timeSlots) {
    if (!jamMulai) return [];

    const startIndex = timeSlots.indexOf(jamMulai);
    if (startIndex === -1) return [];

    const valid = [];

    for (let i = startIndex + 1; i < timeSlots.length; i++) {
      const slot = timeSlots[i];

      if (!availableTimes.includes(slot)) break;

      valid.push(slot);
    }

    return valid;
  }

  // ✅ VALIDASI SEBELUM NAVIGATE KE FORM BOOKING
  const handleBooking = () => {
    // Validasi 1: User sudah booking hari ini
    if (userHasBookedToday) {
      alert("❌ Anda sudah memiliki booking untuk hari ini. Hanya boleh 1 booking per hari.");
      return;
    }

    // Validasi 2: Cek lagi jam yang dipilih belum lewat (untuk hari ini)
    const today = new Date().toISOString().split("T")[0];
    if (selectedDate === today) {
      const now = new Date();
      const [selectedHour, selectedMinute] = jamMulai.split(":").map(Number);
      const selectedTime = new Date();
      selectedTime.setHours(selectedHour, selectedMinute, 0, 0);

      if (selectedTime <= now) {
        alert("❌ Jam yang dipilih sudah lewat. Pilih jam yang lebih baru.");
        return;
      }
    }

    // Validasi 3: Jam mulai & selesai harus ada
    if (!jamMulai || !jamSelesai) {
      alert("❌ Pilih jam mulai dan jam selesai terlebih dahulu.");
      return;
    }

    // ✅ Semua validasi lolos, navigate ke form
    navigate(`/room/book/${selectedRoom}?date=${selectedDate}&start=${jamMulai}&end=${jamSelesai}`);
  };

  // ================= UI =================
  return (
    <>
      <Navbar role={role} />

      <div className="room-container">
        <h2 className="room-title">Peminjaman Ruang</h2>

        {/* FILTER */}
        <div className="room-filter">
          <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
            <option value="">Pilih Ruangan</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.namaRuang}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]} // ✅ tidak bisa pilih tanggal kemarin
          />
        </div>

        {/* ✅ WARNING JIKA USER SUDAH BOOKING HARI INI */}
        {userHasBookedToday && selectedDate && (
          <div
            style={{
              background: "#fff3cd",
              border: "1px solid #ffc107",
              padding: "12px 16px",
              borderRadius: 8,
              marginTop: 16,
              color: "#856404",
            }}
          >
            <strong>⚠️ Perhatian:</strong> Anda sudah memiliki booking aktif untuk tanggal ini. Sistem hanya mengizinkan 1 booking per hari.
          </div>
        )}

        {/* ✅ LOADING INDICATOR */}
        {loadingCheck && (
          <div style={{ textAlign: "center", padding: 16, color: "#666" }}>
            <p>Mengecek ketersediaan...</p>
          </div>
        )}

        {/* JAM */}
        {!loadingCheck && availableTimes.length > 0 && !userHasBookedToday && (
          <div className="time-wrapper">
            {/* JAM MULAI */}
            <div>
              <label>Jam Mulai</label>
              <select value={jamMulai} onChange={(e) => setJamMulai(e.target.value)}>
                <option value="">-- Pilih --</option>
                {TIME_SLOTS.map((jam) => {
                  const isAvailable = availableTimes.includes(jam);
                  return (
                    <option key={jam} value={jam} disabled={!isAvailable}>
                      {jam} {!isAvailable && "(Tidak tersedia)"}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* JAM SELESAI */}
            <div>
              <label>Jam Selesai</label>
              <select value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} disabled={!jamMulai}>
                <option value="">-- Pilih --</option>
                {getValidEndTimes(jamMulai, availableTimes, TIME_SLOTS).map((jam) => (
                  <option key={jam} value={jam}>
                    {jam}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ✅ INFO JIKA TIDAK ADA JAM TERSEDIA */}
        {!loadingCheck && selectedRoom && selectedDate && availableTimes.length === 0 && !userHasBookedToday && (
          <div
            style={{
              background: "#f8d7da",
              border: "1px solid #f5c2c7",
              padding: "12px 16px",
              borderRadius: 8,
              marginTop: 16,
              color: "#842029",
              textAlign: "center",
            }}
          >
            <strong>❌ Tidak ada jam tersedia</strong>
            <p style={{ margin: "8px 0 0 0", fontSize: 14 }}>Semua jam sudah dibooking atau jam sudah lewat untuk hari ini.</p>
          </div>
        )}

        {/* ACTION */}
        {!loadingCheck && jamMulai && jamSelesai && !userHasBookedToday && (
          <div className="action">
            <button className="btn-primary" onClick={handleBooking}>
              Booking Ruangan Ini
            </button>
          </div>
        )}
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default RoomBooking;
