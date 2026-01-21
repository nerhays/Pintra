import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./ManagerApprovalRoomPage.css";

function ManagerApprovalRoomPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState(null);

  const [myDivisi, setMyDivisi] = useState("");
  const [myJabatan, setMyJabatan] = useState("");

  const [data, setData] = useState([]);
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(true);

  // ✅ ambil role + jabatan + divisi user login
  useEffect(() => {
    const init = async () => {
      try {
        if (!auth.currentUser) return;

        const userSnap = await getDocs(query(collection(db, "users"), where("email", "==", auth.currentUser.email)));

        if (userSnap.empty) {
          alert("User profile tidak ditemukan di Firestore");
          return;
        }

        const userData = userSnap.docs[0].data();
        setRole(userData.role || "user");
        setMyDivisi((userData.divisi || "").toLowerCase());
        setMyJabatan((userData.jabatan || "").toLowerCase());

        // ✅ hanya manager yg boleh akses
        if ((userData.jabatan || "").toLowerCase() !== "manager") {
          alert("Halaman ini khusus Manager");
          navigate("/home");
          return;
        }

        // ✅ fetch booking ruang divisi ini yg menunggu approval manager
        const bookingSnap = await getDocs(
          query(
            collection(db, "room_bookings"),
            where("status", "==", "WAITING_MANAGER"),
            where("peminjam.divisi", "==", userData.divisi), // penting: case harus sama
          ),
        );

        const rows = bookingSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setData(rows);
      } catch (err) {
        alert("Gagal load approval manager: " + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  const filtered = useMemo(() => {
    return data.filter((b) => {
      const ruangId = b?.ruang?.roomId || "";
      const text = `${b.namaKegiatan || ""} ${b.peminjam?.email || ""} ${ruangId}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    });
  }, [data, keyword]);

  const approve = async (bookingId) => {
    const ok = confirm("Approve peminjaman ruang ini?");
    if (!ok) return;

    try {
      const ref = doc(db, "room_bookings", bookingId);

      await updateDoc(ref, {
        status: "WAITING_OPERATOR",
        "approval.manager.status": "APPROVED",
        "approval.manager.approvedAt": Timestamp.now(),
        "approval.manager.approvedBy": auth.currentUser.email,
      });

      alert("✅ Approved. Diteruskan ke Operator SDM.");
      setData((prev) => prev.filter((x) => x.id !== bookingId));
    } catch (err) {
      alert("Gagal approve: " + err.message);
      console.error(err);
    }
  };

  const reject = async (bookingId) => {
    const alasan = prompt("Masukkan alasan reject (opsional):") || "-";
    const ok = confirm("Reject peminjaman ini?");
    if (!ok) return;

    try {
      const ref = doc(db, "room_bookings", bookingId);
      const now = Timestamp.now();

      await updateDoc(ref, {
        status: "REJECTED",

        // ✅ samakan dengan sistem utama
        rejectedBy: "MANAGER",
        rejectedNote: alasan,
        updatedAt: now,

        // ✅ approval manager
        "approval.manager.status": "REJECTED",
        "approval.manager.approvedAt": now,
        "approval.manager.note": alasan,

        // ✅ cancel level lain
        "approval.operator.status": "CANCELLED",
        "approval.admin.status": "CANCELLED",
      });

      alert("❌ Ditolak.");
      setData((prev) => prev.filter((x) => x.id !== bookingId));
    } catch (err) {
      alert("Gagal reject: " + err.message);
      console.error(err);
    }
  };

  return (
    <>
      <Navbar role={role} />

      <div className="mgr-approval-container">
        <div className="mgr-approval-header">
          <div>
            <h2>Approval Manager (Ruang)</h2>
            <p>
              Divisi: <b>{myDivisi || "-"}</b> | Jabatan: <b>{myJabatan || "-"}</b>
            </p>
          </div>

          <input className="mgr-search" placeholder="Cari kegiatan / email..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="mgr-empty">
            <p>Tidak ada pengajuan yang menunggu approval manager ✅</p>
          </div>
        ) : (
          <div className="mgr-list">
            {filtered.map((b) => (
              <div key={b.id} className="mgr-card">
                <div className="mgr-card-left">
                  <h4>{b.namaKegiatan || "-"}</h4>
                  <p>
                    <b>Peminjam:</b> {b.peminjam?.email || "-"}
                  </p>
                  <p>
                    <b>Ruangan:</b> {b.ruang?.roomId || "-"}
                  </p>
                  <p>
                    <b>Waktu:</b> {b.waktuMulai?.toDate?.().toLocaleString?.() || "-"} s/d {b.waktuSelesai?.toDate?.().toLocaleString?.() || "-"}
                  </p>

                  <span className="mgr-badge pending">WAITING MANAGER</span>
                </div>

                <div className="mgr-card-right">
                  <button className="btn-approve" onClick={() => approve(b.id)}>
                    Approve
                  </button>
                  <button className="btn-reject" onClick={() => reject(b.id)}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default ManagerApprovalRoomPage;
