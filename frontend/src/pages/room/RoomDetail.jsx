import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./RoomDetail.css";

function RoomDetail() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [role, setRole] = useState(null); // ✅ SAMA DENGAN HOME
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      /** ======================
       *  1️⃣ FETCH ROLE (SAMA DENGAN HOME)
       ======================= */
      if (auth.currentUser) {
        const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));

        const userSnap = await getDocs(q);
        if (!userSnap.empty) {
          setRole(userSnap.docs[0].data().role);
        }
      }

      /** ======================
       *  2️⃣ FETCH ROOM DETAIL
       ======================= */
      const ref = doc(db, "rooms", roomId);
      const roomSnap = await getDoc(ref);

      if (roomSnap.exists()) {
        setRoom(roomSnap.data());
      }

      setLoading(false);
    };

    fetchData();
  }, [roomId]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!room) return <div style={{ padding: 40 }}>Ruang tidak ditemukan</div>;

  return (
    <>
      {/* ✅ SEKARANG ROLE SELALU BENAR */}
      <Navbar role={role} />

      <div className="room-detail-container">
        {/* IMAGE */}
        <div className="room-image-box" />

        {/* CONTENT */}
        <div className="room-info-wrapper">
          <div>
            <h2>{room.namaRuang}</h2>

            <div className="room-meta">
              <div>
                <span className="label">Lokasi</span>
                <div className="box">{room.lokasi}</div>
              </div>

              <div>
                <span className="label">Kapasitas</span>
                <div className="box">{room.kapasitas}</div>
              </div>
            </div>

            <div className="fasilitas">
              <h4>Fasilitas</h4>
              <div className="fasilitas-list">
                {room.fasilitas?.map((f, i) => (
                  <span key={i} className="fasilitas-item">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ACTION */}
          <div className="room-action">
            <div className={`status ${room.status}`}>
              08.00 - 10.30 <br />
              {room.status === "available" ? "Tersedia" : "Tidak Tersedia"}
            </div>

            <button className="btn-pinjam" disabled={room.status !== "available"} onClick={() => navigate(`/room/book/${roomId}/form`)}>
              Pinjam
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
