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

      // ✅ FIX: hanya room yang available boleh muncul
      const onlyAvailableRooms = allRooms.filter((r) => r.status === "available");

      setRooms(onlyAvailableRooms);
    };

    fetchData();
  }, []);

  // ================= HITUNG JAM TERSEDIA =================
  const checkAvailability = async () => {
    if (!selectedRoom || !selectedDate) {
      setAvailableTimes([]);
      return;
    }

    // ✅ double safety: pastikan room masih available
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

      // tambah buffer 2 jam
      const endWithBuffer = new Date(end.getTime() + BUFFER_HOURS * 60 * 60 * 1000);

      TIME_SLOTS.forEach((slot) => {
        const slotTime = new Date(`${selectedDate}T${slot}`);
        if (slotTime >= start && slotTime < endWithBuffer) {
          blockedSlots.add(slot);
        }
      });
    });

    const available = TIME_SLOTS.filter((slot) => !blockedSlots.has(slot));
    setAvailableTimes(available);
  };

  // 🔥 AUTO CHECK SAAT RUANG / TANGGAL BERUBAH
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

      // ❌ begitu ketemu slot yang tidak available → STOP
      if (!availableTimes.includes(slot)) break;

      valid.push(slot);
    }

    return valid;
  }

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

          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>

        {/* JAM */}
        {availableTimes.length > 0 && (
          <div className="time-wrapper">
            {/* JAM MULAI */}
            <div>
              <label>Jam Mulai</label>
              <select value={jamMulai} onChange={(e) => setJamMulai(e.target.value)}>
                <option value="">-- Pilih --</option>
                {TIME_SLOTS.map((jam) => (
                  <option key={jam} value={jam} disabled={!availableTimes.includes(jam)}>
                    {jam} {!availableTimes.includes(jam) && "(Tidak tersedia)"}
                  </option>
                ))}
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

        {/* ACTION */}
        {jamMulai && jamSelesai && (
          <div className="action">
            <button className="btn-primary" onClick={() => navigate(`/room/book/${selectedRoom}?date=${selectedDate}&start=${jamMulai}&end=${jamSelesai}`)}>
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
