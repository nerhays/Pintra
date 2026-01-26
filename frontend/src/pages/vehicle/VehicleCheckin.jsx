import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp, collection, addDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { compressImageToBase64 } from "../../utils/compressImageToBase64";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import "./VehicleCheckin.css";

function VehicleCheckin() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form
  const [kondisi, setKondisi] = useState("Baik");
  const [odometerAkhir, setOdometerAkhir] = useState("");
  const [sisaBBM, setSisaBBM] = useState("50-75%");
  const [kelengkapan, setKelengkapan] = useState("Lengkap");

  const [kelengkapanItems, setKelengkapanItems] = useState({
    dongkrak: true,
    p3k: true,
    segitiga: true,
  });

  const [uraianKelengkapan, setUraianKelengkapan] = useState("");
  const [uraianKondisi, setUraianKondisi] = useState("");

  // ✅ multi foto
  const [fotoBase64List, setFotoBase64List] = useState([]);

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

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handlePhotoChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const base64Arr = [];

      for (const f of files) {
        const result = await compressImageToBase64(f, {
          maxWidth: 1280,
          maxHeight: 720,
          quality: 0.7,
          mimeType: "image/jpeg",
        });

        if (result?.pureBase64) {
          base64Arr.push(result.pureBase64);
        }
      }

      setFotoBase64List((prev) => [...prev, ...base64Arr]);
      e.target.value = "";
    } catch (err) {
      console.error(err);
      alert("Gagal membaca / compress foto!");
    }
  };

  const removePhoto = (index) => {
    setFotoBase64List((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleItem = (key) => {
    setKelengkapanItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const odometerAwal = useMemo(() => {
    return data?.kondisiAwal?.odometerAwal ?? null;
  }, [data]);

  const isReturnAllowed = useMemo(() => {
    if (!data?.waktuKembali?.toDate) return true;
    const target = data.waktuKembali.toDate();
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours <= 2; // ✅ aturan kamu: < 2 jam sebelum waktu kembali
  }, [data]);

  const submitCheckin = async () => {
    if (!auth.currentUser) {
      alert("Harus login");
      return;
    }

    if (!data) {
      alert("Data booking tidak ditemukan");
      return;
    }

    if (data.status !== "ON_GOING") {
      alert("Pengembalian hanya bisa dilakukan jika status ON_GOING");
      return;
    }

    if (!isReturnAllowed) {
      alert("Pengembalian hanya bisa dilakukan 2 jam sebelum waktu kembali.");
      return;
    }

    if (!odometerAkhir || isNaN(Number(odometerAkhir))) {
      alert("Odometer akhir wajib angka");
      return;
    }

    if (odometerAwal !== null && Number(odometerAkhir) < Number(odometerAwal)) {
      alert("Odometer akhir tidak boleh lebih kecil dari odometer awal");
      return;
    }

    if (fotoBase64List.length === 0) {
      alert("Minimal upload 1 foto kondisi akhir!");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const now = Timestamp.now();
      const refBooking = doc(db, "vehicle_bookings", bookingId);

      const payloadKondisiAkhir = {
        filledBy: auth.currentUser.uid,
        filledByName: data.namaPeminjam || data.emailPeminjam || "-",

        // ✅ multi foto
        fotoBase64List: fotoBase64List,
        fotoTimestamp: now,

        kelengkapan: kelengkapan,
        kelengkapanItems: kelengkapanItems,

        kondisi: kondisi,
        odometerAkhir: Number(odometerAkhir),
        sisaBBM: sisaBBM,

        timestamp: now,

        uraianKelengkapan: uraianKelengkapan?.trim() || "-",
        uraianKondisi: uraianKondisi?.trim() || "-",
      };

      // ✅ update booking
      await updateDoc(refBooking, {
        kondisiAkhir: payloadKondisiAkhir,
        actualReturnTime: now,
        status: "DONE",
        updatedAt: now,
      });

      // ✅ update vehicles.odometerTerakhir juga
      const vehicleId = data?.vehicle?.vehicleId;
      if (vehicleId) {
        const refVehicle = doc(db, "vehicles", vehicleId);
        await updateDoc(refVehicle, {
          odometerTerakhir: Number(odometerAkhir),
          updatedAt: now,
        });
      }

      // ✅ log approval_history
      await addDoc(collection(db, "vehicle_bookings", bookingId, "approval_history"), {
        action: "VEHICLE_RETURNED",
        actionBy: data.namaPeminjam || data.emailPeminjam || "-",
        oldStatus: "ON_GOING",
        newStatus: "DONE",
        note: "Kendaraan telah dikembalikan dan kondisi akhir telah dicatat",
        timestamp: now,
        userId: auth.currentUser.uid,
        odometerAkhir: Number(odometerAkhir),
        sisaBBM: sisaBBM,
      });

      alert("✅ Pengembalian berhasil. Status jadi DONE");
      navigate(`/riwayat/kendaraan/${bookingId}`);
    } catch (err) {
      console.error(err);
      alert("❌ Gagal pengembalian: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!data) return <div style={{ padding: 40 }}>Booking tidak ditemukan</div>;

  return (
    <>
      <Navbar />

      <div style={{ padding: 20, maxWidth: 900, margin: "0 auto", paddingTop: 110 }}>
        <button onClick={() => navigate(`/riwayat/kendaraan/${bookingId}`)} style={{ marginBottom: 20 }}>
          ← Kembali
        </button>

        <h2>TAHAP 3 — Pengembalian Kendaraan (Check Akhir)</h2>
        <p>
          Kendaraan: <b>{data.vehicle?.nama || "-"}</b> • <b>{data.vehicle?.platNomor || "-"}</b>
        </p>

        {!isReturnAllowed && <p style={{ color: "red" }}>⛔ Form pengembalian baru muncul 2 jam sebelum waktu kembali.</p>}

        {isReturnAllowed && (
          <div className="checkin-card">
            <div className="form-group">
              <label>Kondisi Kendaraan</label>
              <select value={kondisi} onChange={(e) => setKondisi(e.target.value)}>
                <option value="Baik">Baik</option>
                <option value="Tidak Baik">Tidak Baik</option>
              </select>
            </div>

            <div className="form-group">
              <label>Odometer Akhir</label>
              <input type="number" value={odometerAkhir} onChange={(e) => setOdometerAkhir(e.target.value)} placeholder="contoh: 6500" />
            </div>

            <div className="form-group">
              <label>Sisa BBM (Akhir)</label>
              <select value={sisaBBM} onChange={(e) => setSisaBBM(e.target.value)}>
                <option value="0-25%">0-25%</option>
                <option value="25-50%">25-50%</option>
                <option value="50-75%">50-75%</option>
                <option value="75-100%">75-100%</option>
              </select>
            </div>

            <div className="form-group">
              <label>Kelengkapan</label>
              <select value={kelengkapan} onChange={(e) => setKelengkapan(e.target.value)}>
                <option value="Lengkap">Lengkap</option>
                <option value="Tidak Lengkap">Tidak Lengkap</option>
              </select>
            </div>

            <div className="form-group">
              <label>Checklist Kelengkapan</label>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <label>
                  <input type="checkbox" checked={kelengkapanItems.dongkrak} onChange={() => toggleItem("dongkrak")} /> Dongkrak
                </label>
                <label>
                  <input type="checkbox" checked={kelengkapanItems.p3k} onChange={() => toggleItem("p3k")} /> P3K
                </label>
                <label>
                  <input type="checkbox" checked={kelengkapanItems.segitiga} onChange={() => toggleItem("segitiga")} /> Segitiga
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Uraian Kelengkapan (opsional)</label>
              <textarea value={uraianKelengkapan} onChange={(e) => setUraianKelengkapan(e.target.value)} placeholder="contoh: P3K hilang" />
            </div>

            <div className="form-group">
              <label>Uraian Kondisi (opsional)</label>
              <textarea value={uraianKondisi} onChange={(e) => setUraianKondisi(e.target.value)} placeholder="contoh: ada lecet baru" />
            </div>

            <div className="form-group">
              <label>Foto Kondisi Kendaraan (WAJIB, bisa banyak)</label>
              <input type="file" accept="image/*" multiple onChange={handlePhotoChange} />

              {fotoBase64List.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ color: "green" }}>✅ {fotoBase64List.length} foto tersimpan</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {fotoBase64List.map((_, idx) => (
                      <button key={idx} type="button" onClick={() => removePhoto(idx)} style={{ padding: "4px 10px" }}>
                        Hapus Foto #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button disabled={saving} onClick={submitCheckin} style={{ marginTop: 10 }}>
              {saving ? "Menyimpan..." : "🚗 Simpan & Selesaikan Pengembalian"}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}

export default VehicleCheckin;
