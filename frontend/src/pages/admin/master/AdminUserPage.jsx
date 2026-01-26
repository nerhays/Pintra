import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, updateDoc, serverTimestamp, query, where } from "firebase/firestore";
import { auth, db } from "../../../firebase";

import AdminLayout from "../../../components/admin/AdminLayout";
import "./AdminUserPage.css";

function AdminUserPage() {
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("ADD"); // ADD | EDIT
  const [selectedId, setSelectedId] = useState(null);

  const [saving, setSaving] = useState(false);

  // ✅ role yang login sekarang
  const [myRole, setMyRole] = useState(null);

  // form state
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [nipp, setNipp] = useState("");
  const [divisi, setDivisi] = useState("");
  const [jabatan, setJabatan] = useState("staff");

  const [role, setRole] = useState("user");
  const [noTelp, setNoTelp] = useState("");

  const isAdmin = myRole === "admin";
  const isOperator = myRole === "operator";

  const resetForm = () => {
    setNama("");
    setEmail("");
    setPassword("");
    setNipp("");
    setDivisi("");
    setJabatan("staff");
    setRole("user");
    setNoTelp("");
    setSelectedId(null);
  };

  const fetchMyRole = async () => {
    try {
      if (!auth.currentUser?.email) return;

      const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setMyRole(snap.docs[0].data().role || "user");
      } else {
        setMyRole("user");
      }
    } catch (err) {
      console.error("❌ fetchMyRole error:", err);
      setMyRole("user");
    }
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
    const run = async () => {
      await fetchMyRole();
      await fetchUsers();
    };
    run();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const text = `${u.nama || ""} ${u.email || ""} ${u.nipp || ""} ${u.divisi || ""} ${u.jabatan || ""} ${u.role || ""} ${u.noTelp || ""}`.toLowerCase();
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
    setJabatan(u.jabatan || "staff");
    setRole(u.role || "user");
    setNoTelp(u.noTelp || "");

    setOpenForm(true);
  };

  const handleSubmit = async () => {
    if (saving) return;

    // ✅ validasi
    if (!nama || !email || !jabatan) {
      alert("Nama, Email, Jabatan wajib diisi!");
      return;
    }

    if (mode === "ADD" && !password) {
      alert("Password wajib diisi untuk user baru!");
      return;
    }

    setSaving(true);

    try {
      if (mode === "ADD") {
        // ✅ Tambah user tetap lewat backend
        // ✅ Role boleh dipilih hanya jika admin, operator otomatis hanya user
        const finalRole = isAdmin ? role : "user";

        const res = await fetch("http://localhost:8080/admin/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nama,
            email,
            password,
            nipp,
            divisi,
            jabatan,
            role: finalRole, // ✅ operator tidak bisa assign operator/admin
            noTelp,
          }),
        });

        let result = {};
        try {
          result = await res.json();
        } catch (e) {}

        if (!res.ok) {
          throw new Error(result.message || "Gagal tambah user (backend error)");
        }
      } else {
        // ✅ EDIT Firestore

        // Ambil role lama dari user yg diedit (biar operator gak bisa ubah)
        const oldUser = users.find((x) => x.id === selectedId);
        const oldRole = oldUser?.role || "user";

        // ✅ Payload update aman
        const payload = {
          nama,
          email,
          nipp,
          divisi,
          jabatan,
          noTelp,
          updatedAt: serverTimestamp(),
        };

        // ✅ HANYA ADMIN yang boleh ubah role
        if (isAdmin) {
          payload.role = role;
        } else {
          // operator/staff tidak boleh ubah role → keep old role
          payload.role = oldRole;
        }

        await updateDoc(doc(db, "users", selectedId), payload);
      }

      setOpenForm(false);
      resetForm();
      await fetchUsers();
      alert("Data berhasil disimpan ✅");
    } catch (err) {
      alert("Gagal simpan user: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uid) => {
    // ✅ hanya admin boleh delete
    if (!isAdmin) {
      alert("❌ Hanya admin yang boleh menghapus user!");
      return;
    }

    const ok = confirm("Yakin hapus user ini?");
    if (!ok) return;

    try {
      const res = await fetch(`http://localhost:8080/admin/users/${uid}`, {
        method: "DELETE",
      });

      let result = {};
      try {
        result = await res.json();
      } catch (e) {}

      if (!res.ok) {
        throw new Error(result.message || "Gagal hapus user");
      }

      await fetchUsers();
      alert("User berhasil dihapus ✅");
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
            <input className="search-input" placeholder="Cari nama/email/nipp/divisi/jabatan/role..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />

            <button className="btn-primary" onClick={openAdd}>
              + Tambah User
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-scroll-mobile">
            <table className="user-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>NIPP</th>
                  <th>Divisi</th>
                  <th>Jabatan</th>
                  <th>Role</th>
                  <th>No Telp</th>
                  <th className="sticky-action">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: "center", padding: 20 }}>
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
                        <span className={`jabatan-badge ${u.jabatan === "manager" ? "manager" : "staff"}`}>{u.jabatan || "-"}</span>
                      </td>
                      <td>
                        <span className={`role-badge ${u.role || "user"}`}>{u.role || "user"}</span>
                      </td>
                      <td>{u.noTelp || "-"}</td>

                      <td className="sticky-action">
                        <button className="btn-small" onClick={() => openEdit(u)}>
                          Edit
                        </button>

                        {/* ✅ delete hanya admin */}
                        {isAdmin && (
                          <button className="btn-small danger" onClick={() => handleDelete(u.id)}>
                            Hapus
                          </button>
                        )}
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

                {mode === "ADD" && (
                  <div className="form-group">
                    <label>Password (awal)</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password awal user" />
                  </div>
                )}

                <div className="form-group">
                  <label>NIPP</label>
                  <input value={nipp} onChange={(e) => setNipp(e.target.value)} placeholder="NIPP" />
                </div>

                <div className="form-group">
                  <label>Divisi</label>
                  <input value={divisi} onChange={(e) => setDivisi(e.target.value)} placeholder="Divisi" />
                </div>

                <div className="form-group">
                  <label>Jabatan</label>
                  <select value={jabatan} onChange={(e) => setJabatan(e.target.value)}>
                    <option value="staff">staff</option>
                    <option value="manager">manager</option>
                  </select>
                </div>

                {/* ✅ ROLE: operator tidak boleh ubah */}
                <div className="form-group">
                  <label>Role {!isAdmin && <span style={{ color: "#6b7280", fontSize: 12 }}>(hanya admin)</span>}</label>

                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={!isAdmin}
                    style={{
                      background: !isAdmin ? "#f3f4f6" : "white",
                      cursor: !isAdmin ? "not-allowed" : "pointer",
                    }}
                  >
                    <option value="user">user</option>
                    <option value="operator">operator</option>
                    <option value="admin">admin</option>
                  </select>

                  {!isAdmin && <small style={{ display: "block", marginTop: 6, color: "#6b7280" }}>Operator hanya bisa edit data user, tidak bisa mengubah role.</small>}
                </div>

                <div className="form-group">
                  <label>No Telp</label>
                  <input value={noTelp} onChange={(e) => setNoTelp(e.target.value)} placeholder="628xxxx" />
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

export default AdminUserPage;
