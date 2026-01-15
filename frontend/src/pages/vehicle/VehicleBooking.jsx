import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

import Navbar from "../../components/Navbar";
import VehicleCard from "../../components/VehicleCard";
import "./VehicleBooking.css";

function VehicleBooking() {
  const [keyword, setKeyword] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");

  const [vehicles, setVehicles] = useState([]);
  const [searched, setSearched] = useState(false);

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
    const allVehicles = vehicleSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // 2️⃣ Ambil semua booking kendaraan
    const bookingSnap = await getDocs(collection(db, "vehicle_bookings"));
    const bookings = bookingSnap.docs.map((d) => d.data());

    // 3️⃣ Filter kendaraan tersedia
    const availableVehicles = allVehicles.filter((vehicle) => {
      const relatedBookings = bookings.filter((b) => b.vehicleId === vehicle.id && b.status !== "COMPLETED");

      // cek bentrok
      for (const booking of relatedBookings) {
        const bStart = booking.waktuPinjam.toDate();
        const bEnd = booking.waktuKembali.toDate();

        const isOverlap = userStart < bEnd && userEnd > bStart;

        if (isOverlap) return false;
      }

      return true;
    });

    // filter keyword
    const filtered = availableVehicles.filter((v) => `${v.nama} ${v.platNomor}`.toLowerCase().includes(keyword.toLowerCase()));

    setVehicles(filtered);
    setSearched(true);
  };

  return (
    <>
      <Navbar />

      <div className="vehicle-container">
        <h2 className="vehicle-title">Peminjaman Kendaraan</h2>

        {/* FILTER */}
        <div className="vehicle-filter">
          <input type="text" placeholder="Kendaraan" value={keyword} onChange={(e) => setKeyword(e.target.value)} />

          <input type="datetime-local" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} />

          <span className="to">Sampai</span>

          <input type="datetime-local" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} />

          <button onClick={handleSearch}>Search</button>
        </div>

        {/* HASIL */}
        {searched && (
          <div className="vehicle-list">
            {vehicles.length === 0 ? <p style={{ textAlign: "center" }}>Tidak ada kendaraan tersedia</p> : vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} start={startDateTime} end={endDateTime} />)}
          </div>
        )}
      </div>
    </>
  );
}

export default VehicleBooking;
