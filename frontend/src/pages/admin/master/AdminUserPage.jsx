import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import "./AdminUserPage.css";
import AdminLayout from "../../../components/admin/AdminLayout";

function AdminUserPage() {
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");

  // modal states
  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("ADD"); // ADD | EDIT
  const [selectedId, setSelectedId] = useState(null);

  // form state
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [nipp, setNipp] = useState("");
  const [divisi, setDivisi] = useState("");
  const [role, setRole] = useState("user");
  const [noTelp, setNoTelp] = useState("");

  const resetForm = () => {
    setNama("");
    setEmail("");
    setNipp("");
    setDivisi("");
    setRole("user");
    setNoTelp("");
    setSelectedId(null);
  };

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const text = `${u.nama || ""} ${u.email || ""} ${u.nipp || ""} ${u.divisi || ""} ${u.role || ""}`.toLowerCase();
      return text.includes(keyword.toLowerCase());
    });
  }, [users, keyword]);

  const openAdd = () => {
    resetForm();
    setMode("ADD");
    setOpenForm(true);
  };

  const openEdit = (u) => {
    setMode("EDIT");
    setSelectedId(u.id);

    setNama(u.nama || "");
    setEmail(u.email || "");
    setNipp(u.nipp || "");
    setDivisi(u.divisi || "");
    setRole(u.role || "user");
    setNoTelp(u.noTelp || "");

    setOpenForm(true);
  };

  const handleSubmit = async () => {
    if (!nama || !email || !role) {
      alert("Nama, Email, Role wajib diisi!");
      return;
    }

    try {
      if (mode === "ADD") {
        await addDoc(collection(db, "users"), {
          nama,
          email,
          nipp,
          divisi,
          role,
          noTelp,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "users", selectedId), {
          nama,
          email,
          nipp,
          divisi,
          role,
          noTelp,
          updatedAt: serverTimestamp(),
        });
      }

      setOpenForm(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      alert("Gagal simpan user: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    const ok = confirm("Yakin hapus user ini?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "users", id));
      fetchUsers();
    } catch (err) {
      alert("Gagal delete: " + err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-user-page">
        <div className="admin-user-header">
          <h2>Master Data User</h2>

          <div className="admin-user-actions">
            <input className="search-input" placeholder="Cari nama/email/nipp/divisi/role..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />

            <button className="btn-primary" onClick={openAdd}>
              + Tambah User
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="table-card">
          <table className="user-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Email</th>
                <th>NIPP</th>
                <th>Divisi</th>
                <th>Role</th>
                <th>No Telp</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 20 }}>
                    Tidak ada data user
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, i) => (
                  <tr key={u.id}>
                    <td>{i + 1}</td>
                    <td>{u.nama || "-"}</td>
                    <td>{u.email || "-"}</td>
                    <td>{u.nipp || "-"}</td>
                    <td>{u.divisi || "-"}</td>
                    <td>
                      <span className={`role-badge ${u.role || "user"}`}>{u.role || "user"}</span>
                    </td>
                    <td>{u.noTelp || "-"}</td>
                    <td>
                      <button className="btn-small" onClick={() => openEdit(u)}>
                        Edit
                      </button>
                      <button className="btn-small danger" onClick={() => handleDelete(u.id)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL FORM */}
        {openForm && (
          <div className="modal-overlay" onClick={() => setOpenForm(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>{mode === "ADD" ? "Tambah User" : "Edit User"}</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Nama</label>
                  <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email user" />
                </div>

                <div className="form-group">
                  <label>NIPP</label>
                  <input value={nipp} onChange={(e) => setNipp(e.target.value)} placeholder="NIPP" />
                </div>

                <div className="form-group">
                  <label>Divisi</label>
                  <input value={divisi} onChange={(e) => setDivisi(e.target.value)} placeholder="Divisi" />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="user">user</option>
                    <option value="operator">operator</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>No Telp</label>
                  <input value={noTelp} onChange={(e) => setNoTelp(e.target.value)} placeholder="08xxxx" />
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setOpenForm(false)}>
                  Batal
                </button>
                <button className="btn-primary" onClick={handleSubmit}>
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminUserPage;
