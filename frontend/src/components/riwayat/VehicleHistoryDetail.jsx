import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "./VehicleHistoryDetail.css";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function VehicleHistoryDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [role, setRole] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!auth.currentUser) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setRole(snapshot.docs[0].data().role);
      }
    };

    const fetchDetail = async () => {
      try {
        setLoading(true);

        const ref = doc(db, "vehicle_bookings", bookingId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() });
        } else {
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
    fetchDetail();
  }, [bookingId]);

  const status = data?.status;

  const waktuPinjamStr = useMemo(() => {
    if (!data?.waktuPinjam?.toDate) return "-";
    return data.waktuPinjam.toDate().toLocaleString("id-ID");
  }, [data]);

  const waktuKembaliStr = useMemo(() => {
    if (!data?.waktuKembali?.toDate) return "-";
    return data.waktuKembali.toDate().toLocaleString("id-ID");
  }, [data]);

  // aturan:
  // - status APPROVAL_3 -> munculkan tombol checkout (ambil kunci)
  // - setelah checkout -> ON_GOING
  // - jika ON_GOING dan sisa waktu <= 2 jam -> munculkan tombol pengembalian
  const canCheckout = status === "APPROVED";

  const canCheckin = useMemo(() => {
    if (status !== "ON_GOING") return false;
    if (!data?.waktuKembali?.toDate) return true; // fallback kalau timestamp kosong

    const now = Date.now();
    const end = data.waktuKembali.toDate().getTime();

    // kalau sudah lewat jadwal kembali, tetap boleh kembalikan
    const diff = end - now;
    return diff <= TWO_HOURS_MS;
  }, [status, data]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  if (!data) {
    return (
      <>
        <Navbar role={role} />
        <div style={{ padding: 40 }}>
          <button className="back-btn" onClick={() => navigate("/riwayat")}>
            ← Kembali ke Dashboard
          </button>
          <h2>Data booking tidak ditemukan</h2>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar role={role} />

      <div className="detail-container">
        <button className="back-btn" onClick={() => navigate("/riwayat")}>
          ← Kembali ke Dashboard
        </button>

        {/* STATUS */}
        <div className="status-box">
          {status === "DONE" && <h2 className="success">✔ Peminjaman Telah Selesai!</h2>}

          {status === "ON_GOING" && <h2 className="warning">⚠ Kendaraan Sedang Dipinjam</h2>}

          {status === "APPROVAL_3" && <h2 className="info">Sudah tahap akhir approval (Tinggal Menunggu Admin untuk approved)</h2>}

          {status === "APPROVAL_1" && <h2 className="pending">⏳ Menunggu approval Manager</h2>}
          {status === "APPROVAL_2" && <h2 className="pending">⏳ Menunggu approval Operator</h2>}
          {status === "APPROVED" && <h2 className="info">✅ Ambil Kunci ke Operator, Jangan Lupa Isi Form Check Mobil</h2>}
          {status === "REJECTED" && (
            <h2 className="danger" style={{ color: "red" }}>
              ❌ Pengajuan Ditolak
            </h2>
          )}
        </div>

        {/* CARD DETAIL */}
        <div className="detail-card">
          <p>
            <b>Nama / Email Peminjam:</b> {data.namaPeminjam || data.emailPeminjam || "-"}
          </p>

          <p>
            <b>Divisi:</b> {data.divisi || "-"}
          </p>

          <p>
            <b>Keperluan:</b> {data.keperluan || "-"}
          </p>

          <p>
            <b>Tujuan:</b> {data.tujuan || "-"}
          </p>

          <p>
            <b>Kendaraan:</b> {data.vehicle?.nama || "-"}
          </p>

          <p>
            <b>Plat Nomor:</b> {data.vehicle?.platNomor || "-"}
          </p>

          <p>
            <b>Waktu Pinjam:</b> {waktuPinjamStr}
          </p>

          <p>
            <b>Waktu Kembali:</b> {waktuKembaliStr}
          </p>

          <p>
            <b>Status:</b> {status || "-"}
          </p>

          <p>
            <b>Last Approval:</b> {data.lastApprovalBy || "-"} • {data.lastApprovalRole || "-"} • {data.lastApprovalJabatan || "-"}
          </p>
        </div>

        {/* SECTION KONDISI */}
        <div className="detail-card">
          <h3 style={{ marginBottom: 10 }}>Kondisi Kendaraan</h3>

          <p>
            <b>Kondisi Awal:</b> {data.kondisiAwal?.kondisi || "-"}
          </p>
          <p>
            <b>Odometer Awal:</b> {data.kondisiAwal?.odometerAwal ?? "-"}
          </p>
          <p>
            <b>BBM Awal:</b> {data.kondisiAwal?.sisaBBM || "-"}
          </p>

          <hr style={{ margin: "12px 0" }} />

          <p>
            <b>Kondisi Akhir:</b> {data.kondisiAkhir?.kondisi || "-"}
          </p>
          <p>
            <b>Odometer Akhir:</b> {data.kondisiAkhir?.odometerAkhir ?? "-"}
          </p>
          <p>
            <b>BBM Akhir:</b> {data.kondisiAkhir?.sisaBBM || "-"}
          </p>
        </div>

        {/* ACTION BUTTONS */}
        {canCheckout && (
          <button className="action-btn" onClick={() => navigate(`/vehicle/${bookingId}/checkout`)}>
            ✅ Check Kendaraan (Saat Ambil Kunci)
          </button>
        )}

        {status === "ON_GOING" && !canCheckin && (
          <div style={{ marginTop: 10, textAlign: "center", opacity: 0.8 }}>
            Form pengembalian akan muncul saat <b>2 jam</b> sebelum waktu kembali.
          </div>
        )}

        {canCheckin && (
          <button className="action-btn danger" onClick={() => navigate(`/vehicle/${bookingId}/checkin`)}>
            🚗 Pengembalian Kendaraan (Check Akhir)
          </button>
        )}

        {status === "DONE" && (
          <button className="action-btn" onClick={() => navigate("/riwayat")}>
            ✅ Selesai (Kembali ke Riwayat)
          </button>
        )}
      </div>

      <Footer />
    </>
  );
}

export default VehicleHistoryDetail;
