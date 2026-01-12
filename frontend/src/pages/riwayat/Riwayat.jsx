import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../firebase";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";
import "./Riwayat.css";
import RuangItem from "../../components/riwayat/RuangItem";
import KendaraanItem from "../../components/riwayat/KendaraanItem";

function Riwayat() {
  const [tab, setTab] = useState("RUANG");
  const [data, setData] = useState([]);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchRole = async () => {
      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setRole(snap.docs[0].data().role);
      }
    };
    const fetchData = async () => {
      const uid = auth.currentUser.uid;

      if (tab === "RUANG") {
        const q = query(collection(db, "room_bookings"), where("peminjam.userId", "==", uid));
        const snap = await getDocs(q);
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } else {
        const q = query(collection(db, "vehicle_bookings"), where("peminjamId", "==", uid));
        const snap = await getDocs(q);
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    };

    fetchData();
    fetchRole();
  }, [tab]);

  return (
    <>
      <Navbar role={role} />

      <div className="riwayat-container">
        <h2>Riwayat Peminjaman</h2>

        {/* TAB */}
        <div className="riwayat-tab">
          <button className={tab === "KENDARAAN" ? "active" : ""} onClick={() => setTab("KENDARAAN")}>
            Kendaraan
          </button>
          <button className={tab === "RUANG" ? "active" : ""} onClick={() => setTab("RUANG")}>
            Ruang
          </button>
        </div>

        {/* LIST */}
        <div className="riwayat-list">
          {data.length === 0 && <p className="empty">Belum ada riwayat</p>}

          {data.map((item) => (tab === "RUANG" ? <RuangItem key={item.id} item={item} /> : <KendaraanItem key={item.id} item={item} />))}
        </div>
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default Riwayat;
