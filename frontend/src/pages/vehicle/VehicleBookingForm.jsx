import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, doc, getDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import "./VehicleBookingForm.css";

function VehicleBookingForm() {
  const { vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 🔒 waktu dikunci
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const [vehicle, setVehicle] = useState(null);
  const [role, setRole] = useState(null);

  // FORM STATE
  const [keperluan, setKeperluan] = useState("DINAS");
  const [tujuan, setTujuan] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");
  const [alasan, setAlasan] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // ✅ fetch role biar dashboard admin muncul
      if (auth.currentUser) {
        const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
        const snap = await getDocs(q);
        if (!snap.empty) setRole(snap.docs[0].data().role);
      }

      // ✅ fetch vehicle detail
      const ref = doc(db, "vehicles", vehicleId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setVehicle({ id: snap.id, ...snap.data() });
      }
    };

    fetchData();
  }, [vehicleId]);

  const handleSubmit = async () => {
    try {
      if (!auth.currentUser) {
        alert("Harus login");
        return;
      }

      if (!start || !end) {
        alert("Waktu pinjam tidak valid, ulangi dari halaman list kendaraan");
        return;
      }

      if (!tujuan.trim()) {
        alert("Tujuan wajib diisi");
        return;
      }

      if ((keperluan === "DINAS" || keperluan === "UNDANGAN") && !nomorSurat.trim()) {
        alert("Nomor surat wajib diisi");
        return;
      }

      if (keperluan === "KEGIATAN_LAIN" && !alasan.trim()) {
        alert("Alasan wajib diisi");
        return;
      }

      setLoadingSubmit(true);

      // ✅ convert waktu dari string ke Date
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert("Format tanggal tidak valid");
        setLoadingSubmit(false);
        return;
      }

      await addDoc(collection(db, "vehicle_bookings"), {
        peminjamId: auth.currentUser.uid,
        emailPeminjam: auth.currentUser.email,

        keperluan,
        tujuan,

        nomorSurat: keperluan === "KEGIATAN_LAIN" ? "-" : nomorSurat,
        alasan: keperluan === "KEGIATAN_LAIN" ? alasan : "-",

        waktuPinjam: Timestamp.fromDate(startDate),
        waktuKembali: Timestamp.fromDate(endDate),

        vehicle: {
          vehicleId: vehicleId,
          platNomor: vehicle.platNomor || "-",
          nama: vehicle.nama || "-", // ✅ ini yg benar sesuai Firestore kamu
          tahun: vehicle.tahun || "-",
          jenis: vehicle.jenis || "-",
        },

        status: "SUBMITTED",
        createdAt: Timestamp.now(),
      });

      alert("✅ Pengajuan peminjaman kendaraan berhasil!");
      navigate("/riwayat");
    } catch (err) {
      console.error("ERROR SUBMIT:", err);
      alert("❌ Gagal submit: " + err.message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (!vehicle) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <>
      <Navbar role={role} />

      <div className="vehicle-form-container">
        <h2 className="vehicle-form-title">Formulir Peminjaman Kendaraan</h2>

        <div className="vehicle-form-card">
          {/* LEFT */}
          <div className="form-left">
            <div className="form-group">
              <label>Keperluan Peminjaman</label>
              <select value={keperluan} onChange={(e) => setKeperluan(e.target.value)}>
                <option value="DINAS">DINAS</option>
                <option value="UNDANGAN">UNDANGAN</option>
                <option value="KEGIATAN_LAIN">KEGIATAN LAINNYA</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tujuan Peminjaman</label>
              <input placeholder="Enter tujuan" value={tujuan} onChange={(e) => setTujuan(e.target.value)} />
            </div>

            {(keperluan === "DINAS" || keperluan === "UNDANGAN") && (
              <div className="form-group">
                <label>Nomor Surat Perintah</label>
                <input placeholder="Enter nomor surat" value={nomorSurat} onChange={(e) => setNomorSurat(e.target.value)} />
              </div>
            )}

            {keperluan === "KEGIATAN_LAIN" && (
              <div className="form-group">
                <label>Uraikan Alasan</label>
                <textarea placeholder="Masukkan alasan" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="form-right">
            <div className="vehicle-preview" />

            <h3>{vehicle.platNomor}</h3>
            <p>{vehicle.nama}</p>

            <p className="time-info">
              {start} <br /> s/d <br /> {end}
            </p>

            <button className="btn-submit" onClick={handleSubmit} disabled={loadingSubmit}>
              {loadingSubmit ? "MENGAJUKAN..." : "PINJAM"}
            </button>
          </div>
        </div>
      </div>

      <FooterOrnament />
      <Footer />
    </>
  );
}

export default VehicleBookingForm;
