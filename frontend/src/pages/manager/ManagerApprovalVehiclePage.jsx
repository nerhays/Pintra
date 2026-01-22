import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, doc, updateDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import { addVehicleHistory } from "../../utils/vehicleHistory";

import "./ManagerApprovalVehiclePage.css";

function ManagerApprovalVehiclePage() {
  const navigate = useNavigate();

  const [role, setRole] = useState(null);

  const [myDivisi, setMyDivisi] = useState("");
  const [myJabatan, setMyJabatan] = useState("");

  const [data, setData] = useState([]);
  const [keyword, setKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

        const userDoc = userSnap.docs[0];
        const userData = userDoc.data();

        setRole(userData.role || "user");
        setMyDivisi((userData.divisi || "").toLowerCase());
        setMyJabatan((userData.jabatan || "").toLowerCase());

        // ✅ hanya manager yg boleh akses
        if ((userData.jabatan || "").toLowerCase() !== "manager") {
          alert("Halaman ini khusus Manager");
          navigate("/home");
          return;
        }

        // ✅ fetch booking kendaraan divisi ini yg menunggu approval manager (APPROVAL_1)
        const bookingSnap = await getDocs(
          query(
            collection(db, "vehicle_bookings"),
            where("status", "==", "APPROVAL_1"),
            where("divisi", "==", userData.divisi), // case-sensitive: harus sama
          ),
        );

        const rows = bookingSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setData(rows);
      } catch (err) {
        alert("Gagal load approval manager kendaraan: " + err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  const filtered = useMemo(() => {
    return data.filter((b) => {
      const text = `
        ${b.namaPeminjam || ""} 
        ${b.emailPeminjam || ""} 
        ${b.vehicle?.nama || ""} 
        ${b.vehicle?.platNomor || ""} 
        ${b.tujuan || ""} 
        ${b.keperluan || ""}
      `.toLowerCase();

      return text.includes(keyword.toLowerCase());
    });
  }, [data, keyword]);

  const approve = async (booking) => {
    if (saving) return;
    const ok = confirm("Approve peminjaman kendaraan ini?");
    if (!ok) return;

    try {
      setSaving(true);
      const now = Timestamp.now();

      const ref = doc(db, "vehicle_bookings", booking.id);

      await updateDoc(ref, {
        status: "APPROVAL_2",
        updatedAt: now,

        lastApprovalBy: auth.currentUser.email,
        lastApprovalJabatan: "manager",
        lastApprovalRole: "user",
      });

      // ✅ history
      await addVehicleHistory(booking.id, {
        action: "APPROVED",
        actionBy: booking?.lastApprovalBy || auth.currentUser.email,
        actionRole: "user",
        actionJabatan: "manager",
        userId: auth.currentUser.uid,
        oldStatus: booking.status,
        newStatus: "APPROVAL_2",
        note: "Disetujui Manager Divisi",
        timestamp: now,
      });

      alert("✅ Approved. Diteruskan ke Operator SDM.");
      setData((prev) => prev.filter((x) => x.id !== booking.id));
    } catch (err) {
      alert("Gagal approve: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const reject = async (booking) => {
    if (saving) return;

    const alasan = prompt("Masukkan alasan reject:") || "-";
    const ok = confirm("Reject peminjaman ini?");
    if (!ok) return;

    try {
      setSaving(true);
      const now = Timestamp.now();

      const ref = doc(db, "vehicle_bookings", booking.id);

      await updateDoc(ref, {
        status: "REJECTED",
        alasan: alasan,
        updatedAt: now,

        lastApprovalBy: auth.currentUser.email,
        lastApprovalJabatan: "manager",
        lastApprovalRole: "user",
      });

      // ✅ history
      await addVehicleHistory(booking.id, {
        action: "REJECTED",
        actionBy: auth.currentUser.email,
        actionRole: "user",
        actionJabatan: "manager",
        userId: auth.currentUser.uid,
        oldStatus: booking.status,
        newStatus: "REJECTED",
        note: alasan,
        timestamp: now,
      });

      alert("❌ Ditolak.");
      setData((prev) => prev.filter((x) => x.id !== booking.id));
    } catch (err) {
      alert("Gagal reject: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar role={role} />

      <div className="mgr-approval-container">
        <div className="mgr-approval-header">
          <div>
            <h2>Approval Manager (Kendaraan)</h2>
            <p>
              Divisi: <b>{myDivisi || "-"}</b> | Jabatan: <b>{myJabatan || "-"}</b>
            </p>
          </div>

          <input className="mgr-search" placeholder="Cari peminjam / kendaraan / plat..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>

        {loading ? (
          <p style={{ textAlign: "center" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="mgr-empty">
            <p>Tidak ada pengajuan kendaraan yang menunggu approval manager ✅</p>
          </div>
        ) : (
          <div className="mgr-list">
            {filtered.map((b) => (
              <div key={b.id} className="mgr-card">
                <div className="mgr-card-left">
                  <h4>{b.vehicle?.nama || "-"}</h4>
                  <p>
                    <b>Plat:</b> {b.vehicle?.platNomor || "-"}
                  </p>
                  <p>
                    <b>Peminjam:</b> {b.namaPeminjam || b.emailPeminjam || "-"}
                  </p>
                  <p>
                    <b>Keperluan:</b> {b.keperluan || "-"} • <b>Tujuan:</b> {b.tujuan || "-"}
                  </p>
                  <p>
                    <b>Waktu:</b> {b.waktuPinjam?.toDate?.().toLocaleString?.() || "-"} s/d {b.waktuKembali?.toDate?.().toLocaleString?.() || "-"}
                  </p>

                  <span className="mgr-badge pending">APPROVAL 1 (MANAGER)</span>
                </div>

                <div className="mgr-card-right">
                  <button className="btn-approve" disabled={saving} onClick={() => approve(b)}>
                    Approve
                  </button>
                  <button className="btn-reject" disabled={saving} onClick={() => reject(b)}>
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

export default ManagerApprovalVehiclePage;
