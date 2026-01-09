import { useState } from "react";
import { addDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";

function App() {
  // ===== STATE FORM =====
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [jenisRapat, setJenisRapat] = useState("OFFLINE");

  const [roomId, setRoomId] = useState("ROOM_A");
  const [roomNama, setRoomNama] = useState("Ruang Meeting A");
  const [kapasitas, setKapasitas] = useState(20);

  const [tanggal, setTanggal] = useState("");
  const [jamMulai, setJamMulai] = useState("");
  const [jamSelesai, setJamSelesai] = useState("");
  const [peserta, setPeserta] = useState("100");
  const [konsumsi, setKonsumsi] = useState("TIDAK");
  const [dekorasi, setDekorasi] = useState("");

  // ===== CEK JEDA 2 JAM =====
  const isRoomAvailable = async (start, end) => {
    const q = query(collection(db, "room_bookings"), where("ruang.roomId", "==", roomId));

    const snapshot = await getDocs(q);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      const oldStart = data.waktuMulai.toDate();
      const oldEnd = data.waktuSelesai.toDate();

      // jeda minimal 2 jam
      const minNextStart = new Date(oldEnd.getTime() + 2 * 60 * 60 * 1000);

      if (start < minNextStart && end > oldStart) {
        return false; // bentrok
      }
    }
    return true;
  };

  // ===== SUBMIT FORM =====
  const submitForm = async () => {
    try {
      if (!auth.currentUser) {
        alert("Harus login dulu");
        return;
      }

      if (!tanggal || !jamMulai || !jamSelesai) {
        alert("Tanggal dan jam wajib diisi");
        return;
      }

      const start = new Date(`${tanggal}T${jamMulai}`);
      const end = new Date(`${tanggal}T${jamSelesai}`);

      if (end <= start) {
        alert("Jam selesai harus lebih besar dari jam mulai");
        return;
      }

      const available = await isRoomAvailable(start, end);
      if (!available) {
        alert("Ruang tidak tersedia (minimal jeda 2 jam)");
        return;
      }

      // ===== SIMPAN KE FIRESTORE =====
      await addDoc(collection(db, "room_bookings"), {
        namaKegiatan,
        jenisRapat,

        ruang: {
          roomId,
          nama: roomNama,
          kapasitas,
        },

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

      alert("Peminjaman ruang berhasil diajukan");
    } catch (err) {
      alert(err.message);
    }
  };

  // ===== UI =====
  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h2>Formulir Peminjaman Ruang</h2>

      <input placeholder="Nama Kegiatan" onChange={(e) => setNamaKegiatan(e.target.value)} />
      <br />
      <br />

      <select onChange={(e) => setJenisRapat(e.target.value)}>
        <option value="OFFLINE">Offline</option>
        <option value="Hybrid">Hybrid</option>
      </select>
      <br />
      <br />

      <input type="date" onChange={(e) => setTanggal(e.target.value)} />
      <br />
      <br />

      <input type="time" onChange={(e) => setJamMulai(e.target.value)} />
      <input type="time" onChange={(e) => setJamSelesai(e.target.value)} />
      <br />
      <br />
      <input placeholder="Jumlah Peserta" onChange={(e) => setPeserta(e.target.value)} />
      <br />
      <br />
      <select onChange={(e) => setKonsumsi(e.target.value)}>
        <option value="TIDAK">Tidak</option>
        <option value="NASI">Nasi</option>
        <option value="SNACK">Snack</option>
        <option value="COFFEE_BREAK">Coffee Break</option>
      </select>
      <br />
      <br />

      <textarea placeholder="Catatan Dekorasi" onChange={(e) => setDekorasi(e.target.value)} />
      <br />
      <br />

      <button onClick={submitForm}>PINJAM</button>
    </div>
  );
}

export default App;
