import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./RoomDetail.css";

function RoomDetail() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tanggal = searchParams.get("date");
  const jamMulai = searchParams.get("start");
  const jamSelesai = searchParams.get("end");

  const [room, setRoom] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // ROLE
      if (auth.currentUser) {
        const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
        const snap = await getDocs(q);
        if (!snap.empty) setRole(snap.docs[0].data().role);
      }

      // ROOM
      const ref = doc(db, "rooms", roomId);
      const roomSnap = await getDoc(ref);
      if (roomSnap.exists()) setRoom(roomSnap.data());

      setLoading(false);
    };

    fetchData();
  }, [roomId]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!room) return <div style={{ padding: 40 }}>Ruang tidak ditemukan</div>;

  return (
    <>
      <Navbar role={role} />

      <div className="room-detail-container">
        <div className="room-image-box" />

        <div className="room-info-wrapper">
          <div>
            <h2>{room.namaRuang}</h2>

            <p>
              <strong>Lokasi:</strong> {room.lokasi}
            </p>
            <p>
              <strong>Kapasitas:</strong> {room.kapasitas}
            </p>

            <h4>Fasilitas</h4>
            <div className="fasilitas-list">
              {room.fasilitas?.map((f, i) => (
                <span key={i} className="fasilitas-item">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* ACTION */}
          <div className="room-action">
            <div className="status available">
              {jamMulai} - {jamSelesai} <br />
              Tersedia
            </div>

            <button className="btn-pinjam" onClick={() => navigate(`/room/book/${roomId}/form?date=${tanggal}&start=${jamMulai}&end=${jamSelesai}`)}>
              Booking Ruangan Ini
            </button>
          </div>
        </div>
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default RoomDetail;
