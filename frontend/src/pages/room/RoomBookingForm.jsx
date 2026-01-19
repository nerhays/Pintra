import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./RoomBookingForm.css";

function RoomBookingForm() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 🔒 DATA TERKUNCI DARI DETAIL
  const tanggal = searchParams.get("date");
  const jamMulai = searchParams.get("start");
  const jamSelesai = searchParams.get("end");

  const [role, setRole] = useState(null);

  // ===== STATE FORM =====
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [jenisRapat, setJenisRapat] = useState("OFFLINE");
  const [peserta, setPeserta] = useState("");
  const [konsumsi, setKonsumsi] = useState(["TIDAK"]);
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

  // ===== HANDLER KONSUMSI (MULTI CHECKBOX) =====
  const toggleKonsumsi = (value) => {
    if (value === "TIDAK") {
      setKonsumsi(["TIDAK"]);
      return;
    }

    let updated = konsumsi.includes(value) ? konsumsi.filter((k) => k !== value) : [...konsumsi.filter((k) => k !== "TIDAK"), value];

    if (updated.length === 0) updated = ["TIDAK"];
    setKonsumsi(updated);
  };

  // ===== SUBMIT =====
  const submitForm = async () => {
    try {
      if (!auth.currentUser) {
        alert("Harus login");
        return;
      }

      if (!tanggal || !jamMulai || !jamSelesai) {
        alert("Tanggal / jam tidak valid (akses dari halaman booking)");
        return;
      }

      const start = new Date(`${tanggal}T${jamMulai}`);
      const end = new Date(`${tanggal}T${jamSelesai}`);

      if (!namaKegiatan || !peserta) {
        alert("Nama kegiatan dan jumlah peserta wajib diisi");
        return;
      }

      await addDoc(collection(db, "room_bookings"), {
        namaKegiatan,
        jenisRapat,
        ruang: { roomId },
        waktuMulai: Timestamp.fromDate(start),
        waktuSelesai: Timestamp.fromDate(end),
        peminjam: {
          userId: auth.currentUser.uid,
          email: auth.currentUser.email,
        },
        peserta,
        konsumsi,
        dekorasi: dekorasi.trim() === "" ? "NO" : dekorasi,
        status: "PENDING",
        createdAt: Timestamp.now(),
      });

      alert("Peminjaman ruang berhasil diajukan ✅");
      navigate("/riwayat");
    } catch (err) {
      alert("Gagal submit: " + err.message);
    }
  };

  return (
    <>
      <Navbar role={role} />

      <div className="form-page">
        <h2 className="form-title">Formulir Peminjaman Ruang</h2>

        {/* INFO TERKUNCI */}
        <div className="locked-info">
          <p>
            <strong>Tanggal:</strong> {tanggal}
          </p>
          <p>
            <strong>Jam:</strong> {jamMulai} - {jamSelesai}
          </p>
        </div>

        <div className="form-card">
          <div className="form-group">
            <label>Nama Kegiatan</label>
            <input value={namaKegiatan} onChange={(e) => setNamaKegiatan(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Jenis Rapat</label>
            <select value={jenisRapat} onChange={(e) => setJenisRapat(e.target.value)}>
              <option value="OFFLINE">Offline</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <div className="form-group">
            <label>Jumlah Peserta</label>
            <input type="number" value={peserta} onChange={(e) => setPeserta(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Add Konsumsi</label>
            <div className="checkbox-group">
              {["TIDAK", "NASI", "SNACK", "COFFEE_BREAK"].map((k) => (
                <label key={k} className="checkbox-item">
                  <input type="checkbox" checked={konsumsi.includes(k)} onChange={() => toggleKonsumsi(k)} />
                  {k === "COFFEE_BREAK" ? "Coffee Break" : k.charAt(0) + k.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group full">
            <label>Request Dekorasi (Opsional)</label>
            <textarea placeholder="Kosongkan jika tidak ada" value={dekorasi} onChange={(e) => setDekorasi(e.target.value)} />
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
