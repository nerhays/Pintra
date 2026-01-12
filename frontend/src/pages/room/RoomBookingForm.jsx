import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { addDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./RoomBookingForm.css";

function RoomBookingForm() {
  const { roomId } = useParams();

  // ===== ROLE (SAMA KAYAK HOME) =====
  const [role, setRole] = useState(null);

  // ===== STATE FORM =====
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");
  const [peserta, setPeserta] = useState("");
  const [konsumsi, setKonsumsi] = useState("TIDAK");
  const [dekorasi, setDekorasi] = useState("");

  // ===== FETCH ROLE =====
  useEffect(() => {
    const fetchRole = async () => {
      if (!auth.currentUser) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const snap = await getDocs(q);
      if (!snap.empty) setRole(snap.docs[0].data().role);
    };

    fetchRole();
  }, []);

  // ===== SUBMIT =====
  const submitForm = async () => {
    if (!auth.currentUser) {
      alert("Harus login");
      return;
    }

    if (!tanggal || !jamMulai || !jamSelesai) {
      alert("Tanggal dan jam wajib diisi");
      return;
    }

    const start = new Date(`${tanggal}T${jamMulai}`);
    const end = new Date(`${tanggal}T${jamSelesai}`);

    if (end <= start) {
      alert("Jam tidak valid");
      return;
    }

    await addDoc(collection(db, "room_bookings"), {
      namaKegiatan,
      jenisRapat: "OFFLINE",
      ruang: { roomId },
      waktuMulai: Timestamp.fromDate(start),
      waktuSelesai: Timestamp.fromDate(end),
      peminjam: {
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
      },
      peserta,
      konsumsi,
      dekorasi,
      status: "PENDING",
      createdAt: Timestamp.now(),
    });

    alert("Peminjaman berhasil diajukan");
  };

  return (
    <>
      <Navbar role={role} />

      <div className="form-page">
        <h2 className="form-title">Formulir Peminjaman Ruang</h2>

        <div className="form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Nama Kegiatan</label>
              <input onChange={(e) => setNamaKegiatan(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Tanggal Peminjaman</label>
              <input type="date" onChange={(e) => setTanggal(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Jam Peminjaman</label>
              <div className="time-group">
                <input type="time" onChange={(e) => setJamMulai(e.target.value)} />
                <span>s/d</span>
                <input type="time" onChange={(e) => setJamSelesai(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Jumlah Peserta</label>
              <input type="number" onChange={(e) => setPeserta(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Add Konsumsi</label>
              <select onChange={(e) => setKonsumsi(e.target.value)}>
                <option value="TIDAK">Tidak</option>
                <option value="NASI">Nasi</option>
                <option value="SNACK">Snack</option>
                <option value="COFFEE_BREAK">Coffee Break</option>
              </select>
            </div>
          </div>

          <div className="form-group full">
            <label>Request Dekorasi</label>
            <textarea onChange={(e) => setDekorasi(e.target.value)} />
          </div>

          <div className="form-action">
            <button className="btn-submit" onClick={submitForm}>
              PINJAM
            </button>
          </div>
        </div>
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default RoomBookingForm;
