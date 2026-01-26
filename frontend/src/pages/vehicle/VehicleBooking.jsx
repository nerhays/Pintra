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

  // 🔍 SEARCH KENDARAAN
  const handleSearch = async () => {
    if (!startDateTime || !endDateTime) {
      alert("Tanggal & jam wajib diisi");
      return;
    }

    const userStart = new Date(startDateTime);
    const userEnd = new Date(endDateTime);

    if (userEnd <= userStart) {
      alert("Waktu tidak valid");
      return;
    }

    // 1️⃣ Ambil semua kendaraan
    const vehicleSnap = await getDocs(collection(db, "vehicles"));
    const allVehiclesRaw = vehicleSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // ✅ FIX: hanya kendaraan aktif yang boleh dibooking
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

  return (
    <>
      <Navbar role={role} />

      <div className="vehicle-container">
        <h2 className="vehicle-title">Peminjaman Kendaraan</h2>

        <div className="vehicle-filter">
          <input type="text" placeholder="Kendaraan" value={keyword} onChange={(e) => setKeyword(e.target.value)} />

          <input type="datetime-local" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} />

          <span className="to">Sampai</span>

          <input type="datetime-local" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} />

          <button onClick={handleSearch}>Search</button>
        </div>

        {searched && (
          <div className="vehicle-list">
            {vehicles.length === 0 ? <p style={{ textAlign: "center" }}>Tidak ada kendaraan tersedia</p> : vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} start={startDateTime} end={endDateTime} />)}
          </div>
        )}
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default VehicleBooking;
