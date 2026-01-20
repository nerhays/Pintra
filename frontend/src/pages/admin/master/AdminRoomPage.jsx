import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

import AdminLayout from "../../../components/admin/AdminLayout";
import "./AdminRoomPage.css";

function AdminRoomPage() {
  const [rooms, setRooms] = useState([]);
  const [keyword, setKeyword] = useState("");

  // modal states
  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("ADD"); // ADD | EDIT
  const [selectedId, setSelectedId] = useState(null);

  const [saving, setSaving] = useState(false);

  // form state
  const [namaRuang, setNamaRuang] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [kapasitas, setKapasitas] = useState("");
  const [tipe, setTipe] = useState("offline"); // offline | hybrid
  const [status, setStatus] = useState("available"); // available | booked
  const [fasilitasText, setFasilitasText] = useState(""); // input comma separated

  const resetForm = () => {
    setNamaRuang("");
    setLokasi("");
    setKapasitas("");
    setTipe("offline");
    setStatus("available");
    setFasilitasText("");
    setSelectedId(null);
  };

  const fetchRooms = async () => {
    const snap = await getDocs(collection(db, "rooms"));
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setRooms(data);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const fasilitasStr = Array.isArray(r.fasilitas) ? r.fasilitas.join(" ") : "";
      const text = `${r.namaRuang || ""} ${r.lokasi || ""} ${r.kapasitas || ""} ${r.tipe || ""} ${r.status || ""} ${fasilitasStr}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    });
  }, [rooms, keyword]);

  const openAdd = () => {
    resetForm();
    setMode("ADD");
    setOpenForm(true);
  };

  const openEdit = (r) => {
    setMode("EDIT");
    setSelectedId(r.id);

    setNamaRuang(r.namaRuang || "");
    setLokasi(r.lokasi || "");
    setKapasitas(String(r.kapasitas || ""));
    setTipe(r.tipe || "offline");
    setStatus(r.status || "available");

    setFasilitasText(Array.isArray(r.fasilitas) ? r.fasilitas.join(", ") : "");

    setOpenForm(true);
  };

  const parseFasilitas = () => {
    // input: "proyektor, ac, tv"
    // output: ["proyektor","ac","tv"]
    if (!fasilitasText.trim()) return [];
    return fasilitasText
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  };

  const handleSubmit = async () => {
    if (saving) return;

    if (!namaRuang || !lokasi || !kapasitas) {
      alert("Nama Ruang, Lokasi, Kapasitas wajib diisi!");
      return;
    }

    setSaving(true);

    try {
      const fasilitas = parseFasilitas();

      const payload = {
        namaRuang,
        lokasi,
        kapasitas: String(kapasitas),
        tipe, // offline | hybrid
        status, // available | booked
        fasilitas,
      };

      if (mode === "ADD") {
        await addDoc(collection(db, "rooms"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "rooms", selectedId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      }

      setOpenForm(false);
      resetForm();
      await fetchRooms();
      alert("Data ruangan berhasil disimpan ✅");
    } catch (err) {
      alert("Gagal simpan ruangan: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = confirm("Yakin hapus ruangan ini?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "rooms", id));
      await fetchRooms();
      alert("Ruangan berhasil dihapus ✅");
    } catch (err) {
      alert("Gagal delete ruangan: " + err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-room-page">
        <div className="admin-room-header">
          <h2>Master Data Ruangan</h2>

          <div className="admin-room-actions">
            <input className="search-input" placeholder="Cari nama/lokasi/kapasitas/tipe/status/fasilitas..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />

            <button className="btn-primary" onClick={openAdd}>
              + Tambah Ruangan
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-card">
          <div className="table-scroll-mobile">
            <table className="room-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Ruang</th>
                  <th>Lokasi</th>
                  <th>Kapasitas</th>
                  <th>Tipe</th>
                  <th>Status</th>
                  <th>Fasilitas</th>
                  <th className="sticky-action">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredRooms.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.namaRuang || "-"}</td>
                    <td>{r.lokasi || "-"}</td>
                    <td>{r.kapasitas || "-"}</td>
                    <td>
                      <span className={`type-badge ${r.tipe || "offline"}`}>{r.tipe || "offline"}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${r.status || "available"}`}>{r.status || "available"}</span>
                    </td>
                    <td>{Array.isArray(r.fasilitas) ? r.fasilitas.join(", ") : "-"}</td>

                    {/* ✅ sticky */}
                    <td className="sticky-action">
                      <button className="btn-small" onClick={() => openEdit(r)}>
                        Edit
                      </button>
                      <button className="btn-small danger" onClick={() => handleDelete(r.id)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL FORM */}
        {openForm && (
          <div className="modal-overlay" onClick={() => setOpenForm(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{mode === "ADD" ? "Tambah Ruangan" : "Edit Ruangan"}</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Nama Ruang</label>
                  <input value={namaRuang} onChange={(e) => setNamaRuang(e.target.value)} placeholder="Contoh: Ruang Tanjung Emas" />
                </div>

                <div className="form-group">
                  <label>Lokasi</label>
                  <input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Contoh: Gedung A Lantai 2" />
                </div>

                <div className="form-group">
                  <label>Kapasitas</label>
                  <input type="number" value={kapasitas} onChange={(e) => setKapasitas(e.target.value)} placeholder="Contoh: 20" />
                </div>

                <div className="form-group">
                  <label>Tipe</label>
                  <select value={tipe} onChange={(e) => setTipe(e.target.value)}>
                    <option value="offline">offline</option>
                    <option value="hybrid">hybrid</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="available">available</option>
                    <option value="booked">booked</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fasilitas (pisahkan dengan koma)</label>
                  <input value={fasilitasText} onChange={(e) => setFasilitasText(e.target.value)} placeholder="proyektor, whiteboard, ac, tv" />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenForm(false);
                  }}
                >
                  Batal
                </button>

                <button
                  className="btn-primary"
                  disabled={saving}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubmit();
                  }}
                >
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

export default AdminRoomPage;
