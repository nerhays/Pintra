import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { addDoc, collection, doc, getDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { getMainImageDataUrl } from "../../utils/getMainImage";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import FooterOrnament from "../../components/FooterOrnament";

import { addVehicleHistory } from "../../utils/vehicleHistory";

import "./VehicleBookingForm.css";

function VehicleBookingForm() {
  const { vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 🔒 waktu dikunci
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const [vehicle, setVehicle] = useState(null);

  // navbar role
  const [role, setRole] = useState(null);

  // ✅ user profile (biar dapat divisi/jabatan/nipp)
  const [userProfile, setUserProfile] = useState(null);

  // FORM STATE
  const [keperluan, setKeperluan] = useState("DINAS");
  const [tujuan, setTujuan] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");
  const [alasan, setAlasan] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  // ✅ cari manager divisi (untuk staff/operator yang bukan manager)
  const findManagerDivisi = async (divisi) => {
    if (!divisi) return null;

    const qManager = query(collection(db, "users"), where("divisi", "==", divisi), where("jabatan", "==", "manager"));
    const managerSnap = await getDocs(qManager);

    if (managerSnap.empty) return null;

    const managerDoc = managerSnap.docs[0];

    return {
      uid: managerDoc.id,
      ...managerDoc.data(),
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      // ✅ ambil profile user login
      const uq = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const usnap = await getDocs(uq);

      if (!usnap.empty) {
        const profile = { uid: usnap.docs[0].id, ...usnap.docs[0].data() };
        setUserProfile(profile);
        setRole(profile.role || "user");
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

      if (!userProfile) {
        alert("Profile user belum terbaca (cek data users di Firestore)");
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

      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert("Format tanggal tidak valid");
        setLoadingSubmit(false);
        return;
      }

      const now = Timestamp.now();

      const roleBorrower = (userProfile.role || "").toLowerCase();
      const jabatanBorrower = (userProfile.jabatan || "").toLowerCase();

      const isAdminBorrower = roleBorrower === "admin";
      const isManagerBorrower = jabatanBorrower === "manager";

      // ✅ cari manager kalau peminjam bukan admin dan bukan manager
      let manager = null;
      if (!isAdminBorrower && !isManagerBorrower) {
        manager = await findManagerDivisi(userProfile.divisi);

        if (!manager) {
          alert("Manager divisi tidak ditemukan. Pastikan ada user jabatan=manager pada divisi ini.");
          setLoadingSubmit(false);
          return;
        }
      }

      // ✅ STATUS FLOW
      let initialStatus = "SUBMITTED";
      if (isAdminBorrower) initialStatus = "APPROVAL_3";
      else if (isManagerBorrower) initialStatus = "APPROVAL_1";

      // ✅ booking payload (TANPA nested approval object)
      const payload = {
        peminjamId: auth.currentUser.uid,
        emailPeminjam: auth.currentUser.email,
        namaPeminjam: userProfile.nama || "-",
        nipp: userProfile.nipp || "-",
        jabatan: jabatanBorrower || "-",
        divisi: userProfile.divisi || "-",
        rolePeminjam: roleBorrower || "user",

        keperluan,
        tujuan,
        nomorSurat: keperluan === "KEGIATAN_LAIN" ? "-" : nomorSurat.trim(),
        alasan: keperluan === "KEGIATAN_LAIN" ? alasan.trim() : "-",

        waktuPinjam: Timestamp.fromDate(startDate),
        waktuKembali: Timestamp.fromDate(endDate),

        vehicle: {
          vehicleId: vehicleId,
          platNomor: vehicle?.platNomor || "-",
          nama: vehicle?.nama || "-",
          tahun: vehicle?.tahun || "-",
          jenis: vehicle?.jenis || "-",
        },

        status: initialStatus,
        createdAt: now,
        updatedAt: now,

        lastApprovalBy: userProfile.nama || auth.currentUser.email,
        lastApprovalJabatan: jabatanBorrower || "-",
        lastApprovalRole: roleBorrower || "user",

        // ✅ TAMBAHAN: Info manager untuk WA (jika ada)
        ...(manager && {
          managerInfo: {
            uid: manager.uid,
            nama: manager.nama || "-",
            email: manager.email || "-",
            noTelp: manager.noTelp || "-", // ✅ PENTING!
          },
        }),
      };

      const docRef = await addDoc(collection(db, "vehicle_bookings"), payload);

      // ✅ history pertama
      await addVehicleHistory(docRef.id, {
        action: "SUBMITTED",
        actionBy: userProfile.nama || auth.currentUser.email,
        actionRole: roleBorrower || "user",
        actionJabatan: jabatanBorrower || "-",
        userId: auth.currentUser.uid,
        oldStatus: "-",
        newStatus: initialStatus,
        note: "Pengajuan kendaraan dibuat",
        timestamp: now,
      });

      // 🔥 KIRIM WA KE MANAGER (kalau bukan admin/manager)
      if (!isAdminBorrower && !isManagerBorrower) {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

        try {
          await fetch(`${API_URL}/approval/vehicle/manager/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId: docRef.id,
            }),
          });
          console.log("✅ WA approval sent to manager");
        } catch (err) {
          console.error("❌ Error sending WA:", err);
          // Tidak perlu alert, biarkan booking tetap jalan
        }
      }

      // ✅ notif sesuai role
      if (isAdminBorrower) {
        alert("✅ Booking kendaraan berhasil (Auto Approved karena ADMIN)");
      } else if (isManagerBorrower) {
        alert("✅ Booking kendaraan berhasil (Auto Approved Manager, lanjut Approval Operator)");
      } else {
        alert("✅ Booking kendaraan berhasil diajukan. Menunggu approval Manager Divisi.");
      }

      navigate("/riwayat");
    } catch (err) {
      console.error("ERROR SUBMIT:", err);
      alert("❌ Gagal submit: " + err.message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (!vehicle) return <div style={{ padding: 40 }}>Loading...</div>;
  const imageSrc = getMainImageDataUrl(vehicle?.photos);

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
              <label>Lokasi Tujuan Peminjaman</label>
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
                <label>Uraian</label>
                <textarea placeholder="Masukkan uraian" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="form-right">
            <div className="vehicle-preview">{imageSrc ? <img src={imageSrc} alt={vehicle.nama} /> : <div className="vehicle-preview-placeholder">🚗</div>}</div>

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
