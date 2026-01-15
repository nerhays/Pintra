import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, doc, getDoc, Timestamp } from "firebase/firestore";
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

  // FORM STATE
  const [keperluan, setKeperluan] = useState("DINAS");
  const [tujuan, setTujuan] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");
  const [alasan, setAlasan] = useState("");

  useEffect(() => {
    const fetchVehicle = async () => {
      const ref = doc(db, "vehicles", vehicleId);
      const snap = await getDoc(ref);
      if (snap.exists()) setVehicle(snap.data());
    };
    fetchVehicle();
  }, [vehicleId]);

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      alert("Harus login");
      return;
    }

    if (!tujuan) {
      alert("Tujuan wajib diisi");
      return;
    }

    if ((keperluan === "DINAS" || keperluan === "UNDANGAN") && !nomorSurat) {
      alert("Nomor surat wajib diisi");
      return;
    }

    if (keperluan === "KEGIATAN_LAIN" && !alasan) {
      alert("Alasan wajib diisi");
      return;
    }

    await addDoc(collection(db, "vehicle_bookings"), {
      peminjamId: auth.currentUser.uid,
      namaPeminjam: auth.currentUser.email,

      vehicleId,
      vehicleSnapshot: {
        namaKendaraan: vehicle.namaKendaraan,
        platNomor: vehicle.platNomor,
      },

      keperluan,
      tujuan,
      nomorSurat: keperluan === "KEGIATAN_LAIN" ? "-" : nomorSurat,
      alasan: keperluan === "KEGIATAN_LAIN" ? alasan : "-",

      waktuPinjam: Timestamp.fromDate(new Date(start)),
      waktuKembali: Timestamp.fromDate(new Date(end)),

      status: "SUBMITTED",
      createdAt: Timestamp.now(),
    });

    alert("Pengajuan peminjaman berhasil");
    navigate("/riwayat");
  };

  if (!vehicle) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <>
      <Navbar />

      <div className="vehicle-form-container">
        <h2>Formulir Peminjaman Kendaraan</h2>

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
            <p>{vehicle.namaKendaraan}</p>

            <p className="time-info">
              {start} <br /> s/d <br /> {end}
            </p>

            <button className="btn-submit" onClick={handleSubmit}>
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

export default VehicleBookingForm;
