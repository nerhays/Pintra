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

  // 🔒 data terkunci
  const tanggal = searchParams.get("date");
  const jamMulai = searchParams.get("start");
  const jamSelesai = searchParams.get("end");

  const [roleNavbar, setRoleNavbar] = useState(null);

  // ✅ data peminjam dari users collection
  const [userProfile, setUserProfile] = useState(null);

  // ===== STATE FORM =====
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [jenisRapat, setJenisRapat] = useState("OFFLINE");
  const [peserta, setPeserta] = useState("");
  const [konsumsi, setKonsumsi] = useState(["TIDAK"]);
  const [dekorasi, setDekorasi] = useState("");

  const [saving, setSaving] = useState(false);

  // ===== FETCH USER PROFILE =====
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));

      const snap = await getDocs(q);

      if (!snap.empty) {
        const data = snap.docs[0].data();
        setUserProfile(data);

        // navbar role
        setRoleNavbar(data.role);
      }
    };

    fetchUserProfile();
  }, []);

  // ===== HANDLER KONSUMSI =====
  const toggleKonsumsi = (value) => {
    if (value === "TIDAK") {
      setKonsumsi(["TIDAK"]);
      return;
    }

    let updated = konsumsi.includes(value) ? konsumsi.filter((k) => k !== value) : [...konsumsi.filter((k) => k !== "TIDAK"), value];

    if (updated.length === 0) updated = ["TIDAK"];
    setKonsumsi(updated);
  };

  // ✅ cari manager divisi
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

  // ===== SUBMIT =====
  const submitForm = async () => {
    if (saving) return;

    try {
      if (!auth.currentUser) {
        alert("Harus login");
        return;
      }

      if (!userProfile) {
        alert("User profile belum terbaca");
        return;
      }

      if (!tanggal || !jamMulai || !jamSelesai) {
        alert("Tanggal / jam tidak valid (akses dari halaman booking)");
        return;
      }

      if (!namaKegiatan || !peserta) {
        alert("Nama kegiatan dan jumlah peserta wajib diisi");
        return;
      }

      const start = new Date(`${tanggal}T${jamMulai}`);
      const end = new Date(`${tanggal}T${jamSelesai}`);

      setSaving(true);

      // ✅ cek apakah peminjam admin
      const isAdminBorrower = userProfile.role === "admin";

      // ✅ cari manager (kalau bukan admin)
      let manager = null;
      if (!isAdminBorrower) {
        manager = await findManagerDivisi(userProfile.divisi);

        if (!manager) {
          alert("Manager divisi tidak ditemukan. Pastikan ada user jabatan=manager pada divisi ini.");
          setSaving(false);
          return;
        }
      }

      // ✅ status awal
      const initialStatus = isAdminBorrower ? "APPROVED" : "WAITING_MANAGER";

      // ✅ approval object
      const approval = {
        manager: isAdminBorrower
          ? { uid: "-", nama: "-", email: "-", status: "AUTO_APPROVED" }
          : {
              uid: manager.uid,
              nama: manager.nama || "-",
              email: manager.email || "-",
              status: "PENDING",
              approvedAt: null,
            },

        operator: {
          uid: "-",
          nama: "-",
          email: "-",
          status: isAdminBorrower ? "AUTO_APPROVED" : "WAITING",
          approvedAt: null,
        },

        admin: {
          uid: "-",
          nama: "-",
          email: "-",
          status: isAdminBorrower ? "AUTO_APPROVED" : "WAITING",
          approvedAt: null,
        },
      };

      // ✅ simpan booking
      await addDoc(collection(db, "room_bookings"), {
        namaKegiatan,
        jenisRapat,

        ruang: { roomId },

        waktuMulai: Timestamp.fromDate(start),
        waktuSelesai: Timestamp.fromDate(end),

        peminjam: {
          userId: auth.currentUser.uid,
          email: auth.currentUser.email,

          // ✅ snapshot user
          nama: userProfile.nama || "-",
          nipp: userProfile.nipp || "-",
          divisi: userProfile.divisi || "-",
          jabatan: userProfile.jabatan || "-",
          role: userProfile.role || "user",
        },

        peserta,
        konsumsi,
        dekorasi: dekorasi.trim() === "" ? "NO" : dekorasi,

        approval,
        status: initialStatus,

        createdAt: Timestamp.now(),
      });

      alert(isAdminBorrower ? "Booking berhasil ✅ (Auto Approved karena akun admin)" : "Booking berhasil diajukan ✅ Menunggu approval manager");

      navigate("/riwayat");
    } catch (err) {
      alert("Gagal submit: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar role={roleNavbar} />

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

          <br />

          <div className="form-group">
            <label>Jenis Rapat</label>
            <select value={jenisRapat} onChange={(e) => setJenisRapat(e.target.value)}>
              <option value="OFFLINE">Offline</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>

          <br />

          <div className="form-group">
            <label>Jumlah Peserta</label>
            <input type="number" value={peserta} onChange={(e) => setPeserta(e.target.value)} />
          </div>

          <br />

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

          <br />

          <div className="form-group full">
            <label>Request Dekorasi (Opsional)</label>
            <textarea placeholder="Kosongkan jika tidak ada" value={dekorasi} onChange={(e) => setDekorasi(e.target.value)} />
          </div>

          <div className="form-action">
            <button className="btn-submit" onClick={submitForm} disabled={saving}>
              {saving ? "Menyimpan..." : "PINJAM"}
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
