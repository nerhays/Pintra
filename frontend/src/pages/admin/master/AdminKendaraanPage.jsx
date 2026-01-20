import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

import AdminLayout from "../../../components/admin/AdminLayout";
import "./AdminKendaraanPage.css";

function AdminKendaraanPage() {
  const [vehicles, setVehicles] = useState([]);
  const [keyword, setKeyword] = useState("");

  // modal
  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("ADD"); // ADD | EDIT
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [nama, setNama] = useState("");
  const [platNomor, setPlatNomor] = useState("");
  const [jenis, setJenis] = useState("Mobil");
  const [transmisi, setTransmisi] = useState("A/T");
  const [bbm, setBbm] = useState("Bensin");
  const [tahun, setTahun] = useState("");
  const [kursi, setKursi] = useState("");
  const [odometerTerakhir, setOdometerTerakhir] = useState("");
  const [statusAktif, setStatusAktif] = useState(true);

  // kelengkapan input (dipisah pakai koma)
  const [kelengkapanText, setKelengkapanText] = useState("");

  const resetForm = () => {
    setNama("");
    setPlatNomor("");
    setJenis("Mobil");
    setTransmisi("A/T");
    setBbm("Bensin");
    setTahun("");
    setKursi("");
    setOdometerTerakhir("");
    setStatusAktif(true);
    setKelengkapanText("");
    setSelectedId(null);
  };

  const fetchVehicles = async () => {
    const snap = await getDocs(collection(db, "vehicles"));
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setVehicles(data);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const text = `${v.nama || ""} ${v.platNomor || ""} ${v.jenis || ""} ${v.transmisi || ""} ${v.bbm || ""} ${v.tahun || ""}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    });
  }, [vehicles, keyword]);

  const openAdd = () => {
    resetForm();
    setMode("ADD");
    setOpenForm(true);
  };

  const openEdit = (v) => {
    setMode("EDIT");
    setSelectedId(v.id);

    setNama(v.nama || "");
    setPlatNomor(v.platNomor || "");
    setJenis(v.jenis || "Mobil");
    setTransmisi(v.transmisi || "A/T");
    setBbm(v.bbm || "Bensin");
    setTahun(v.tahun ?? "");
    setKursi(v.kursi ?? "");
    setOdometerTerakhir(v.odometerTerakhir ?? "");
    setStatusAktif(v.statusAktif ?? true);

    // array jadi text
    const arr = Array.isArray(v.kelengkapan) ? v.kelengkapan : [];
    setKelengkapanText(arr.join(", "));

    setOpenForm(true);
  };

  const parseKelengkapan = () => {
    // input: "P3K, Dongkrak, Apar"
    // output: ["P3K","Dongkrak","Apar"]
    const items = kelengkapanText
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    return items;
  };

  const handleSubmit = async () => {
    if (saving) return;

    // validasi wajib
    if (!nama || !platNomor || !jenis || !transmisi || !bbm) {
      alert("Nama, Plat Nomor, Jenis, Transmisi, BBM wajib diisi!");
      return;
    }

    const tahunNumber = tahun === "" ? null : Number(tahun);
    const kursiNumber = kursi === "" ? null : Number(kursi);
    const odoNumber = odometerTerakhir === "" ? 0 : Number(odometerTerakhir);

    if (tahunNumber !== null && isNaN(tahunNumber)) {
      alert("Tahun harus angka");
      return;
    }
    if (kursiNumber !== null && isNaN(kursiNumber)) {
      alert("Kursi harus angka");
      return;
    }
    if (isNaN(odoNumber)) {
      alert("Odometer harus angka");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nama: nama.trim(),
        platNomor: platNomor.trim().toUpperCase(),
        jenis,
        transmisi,
        bbm,
        tahun: tahunNumber ?? "",
        kursi: kursiNumber ?? "",
        odometerTerakhir: odoNumber,
        statusAktif: Boolean(statusAktif),
        kelengkapan: parseKelengkapan(),
      };

      if (mode === "ADD") {
        await addDoc(collection(db, "vehicles"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "vehicles", selectedId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      }

      setOpenForm(false);
      resetForm();
      await fetchVehicles();
      alert("Data kendaraan berhasil disimpan ✅");
    } catch (err) {
      alert("Gagal simpan kendaraan: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = confirm("Yakin hapus kendaraan ini?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "vehicles", id));
      await fetchVehicles();
      alert("Kendaraan berhasil dihapus ✅");
    } catch (err) {
      alert("Gagal hapus kendaraan: " + err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-kendaraan-page">
        <div className="admin-kendaraan-header">
          <h2>Master Data Kendaraan</h2>

          <div className="admin-kendaraan-actions">
            <input className="search-input" placeholder="Cari nama / plat / jenis / transmisi / bbm / tahun..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />

            <button className="btn-primary" onClick={openAdd}>
              + Tambah Kendaraan
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-card">
          <div className="table-scroll">
            <table className="kendaraan-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Plat</th>
                  <th>Jenis</th>
                  <th>Transmisi</th>
                  <th>BBM</th>
                  <th>Tahun</th>
                  <th>Kursi</th>
                  <th>Kelengkapan</th>
                  <th>Odometer</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ textAlign: "center", padding: 20 }}>
                      Tidak ada data kendaraan
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v, i) => (
                    <tr key={v.id}>
                      <td>{i + 1}</td>
                      <td>{v.nama || "-"}</td>
                      <td>{v.platNomor || "-"}</td>
                      <td>{v.jenis || "-"}</td>
                      <td>{v.transmisi || "-"}</td>
                      <td>{v.bbm || "-"}</td>
                      <td>{v.tahun ?? "-"}</td>
                      <td>{v.kursi ?? "-"}</td>
                      <td>{Array.isArray(v.kelengkapan) ? v.kelengkapan.join(", ") : "-"}</td>
                      <td>{v.odometerTerakhir ?? 0} km</td>
                      <td>
                        <span className={`status-badge ${v.statusAktif ? "aktif" : "nonaktif"}`}>{v.statusAktif ? "Aktif" : "Nonaktif"}</span>
                      </td>
                      <td>
                        <button className="btn-small" onClick={() => openEdit(v)}>
                          Edit
                        </button>
                        <button className="btn-small danger" onClick={() => handleDelete(v.id)}>
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FORM */}
        {openForm && (
          <div className="modal-overlay" onClick={() => setOpenForm(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{mode === "ADD" ? "Tambah Kendaraan" : "Edit Kendaraan"}</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Nama Kendaraan</label>
                  <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Innova Zenix Hitam" />
                </div>

                <div className="form-group">
                  <label>Plat Nomor</label>
                  <input value={platNomor} onChange={(e) => setPlatNomor(e.target.value)} placeholder="L 0001 SRJ" />
                </div>

                <div className="form-group">
                  <label>Jenis</label>
                  <select value={jenis} onChange={(e) => setJenis(e.target.value)}>
                    <option value="Mobil">Mobil</option>
                    <option value="Motor">Motor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Transmisi</label>
                  <select value={transmisi} onChange={(e) => setTransmisi(e.target.value)}>
                    <option value="A/T">A/T</option>
                    <option value="M/T">M/T</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Jenis BBM</label>
                  <select value={bbm} onChange={(e) => setBbm(e.target.value)}>
                    <option value="Bensin">Bensin</option>
                    <option value="Diesel">Diesel</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tahun</label>
                  <input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} placeholder="2020" />
                </div>

                <div className="form-group">
                  <label>Jumlah Kursi</label>
                  <input type="number" value={kursi} onChange={(e) => setKursi(e.target.value)} placeholder="7" />
                </div>

                <div className="form-group">
                  <label>Odometer Terakhir (km)</label>
                  <input type="number" value={odometerTerakhir} onChange={(e) => setOdometerTerakhir(e.target.value)} placeholder="0" />
                </div>

                <div className="form-group full">
                  <label>Kelengkapan (pisahkan dengan koma)</label>
                  <input value={kelengkapanText} onChange={(e) => setKelengkapanText(e.target.value)} placeholder="P3K, Dongkrak, Apar" />
                </div>

                <div className="form-group">
                  <label>Status Aktif</label>
                  <select value={statusAktif ? "true" : "false"} onChange={(e) => setStatusAktif(e.target.value === "true")}>
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setOpenForm(false)}>
                  Batal
                </button>

                <button className="btn-primary" disabled={saving} onClick={handleSubmit}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminKendaraanPage;
