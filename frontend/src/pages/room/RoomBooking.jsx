import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./RoomBooking.css";

function RoomBooking() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);

  const [role, setRole] = useState(null);

  // FILTER STATE
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      // 🔹 ROLE (sama seperti Home)
      if (auth.currentUser) {
        const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setRole(snap.docs[0].data().role);
        }
      }

      // 🔹 ROOMS
      const snapRooms = await getDocs(collection(db, "rooms"));
      const data = snapRooms.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRooms(data);
      setFilteredRooms(data);
    };

    fetchData();
  }, []);

  const handleSearch = () => {
    const result = rooms.filter((room) => room.namaRuang.toLowerCase().includes(keyword.toLowerCase()));
    setFilteredRooms(result);
  };

  return (
    <>
      <Navbar role={role} />

      <div className="room-container">
        <h2 className="room-title">Peminjaman Ruang</h2>

        {/* 🔍 FILTER */}
        <div className="room-filter">
          <input type="text" placeholder="Ruangan" value={keyword} onChange={(e) => setKeyword(e.target.value)} />

          <input type="date" />
          <input type="time" />
          <span className="to">to</span>
          <input type="time" />

          <button onClick={handleSearch}>Search</button>
        </div>

        {/* 🧱 GRID CARD */}
        <div className="room-grid">
          {filteredRooms.map((room) => (
            <div key={room.id} className="room-card" onClick={() => navigate(`/room/book/${room.id}`)}>
              <div className="room-image" />

              <div className="room-info">
                <h4>{room.namaRuang}</h4>
                <p>Lokasi: {room.lokasi}</p>
                <p>Kapasitas: {room.kapasitas}</p>
                <p>Jenis Rapat: {room.tipe}</p>

                <span className={`status ${room.status === "available" ? "available" : "booked"}`}>{room.status === "available" ? "Tersedia" : "Terpakai"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default RoomBooking;
