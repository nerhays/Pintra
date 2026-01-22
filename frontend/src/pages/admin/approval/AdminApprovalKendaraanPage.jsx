import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where, Timestamp } from "firebase/firestore";
import { auth, db } from "../../../firebase";

import AdminLayout from "../../../components/admin/AdminLayout";
import { addVehicleHistory } from "../../../utils/vehicleHistory";

import "./AdminApprovalKendaraanPage.css";

function AdminApprovalKendaraanPage() {
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [keyword, setKeyword] = useState("");

  const [saving, setSaving] = useState(false);

  // modal reject
  const [openReject, setOpenReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

  // ===================== PROFILE =====================
  const fetchProfile = async () => {
    if (!auth.currentUser) return;

    const ref = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setMyProfile({ uid: snap.id, ...snap.data() });
    }
  };

  // ===================== LEVEL LOGIC =====================
  const getMyLevel = (profile) => {
    const role = (profile?.role || "").toLowerCase();
    const jabatan = (profile?.jabatan || "").toLowerCase();

    // ✅ urutan prioritas:
    if (role === "admin") return "admin";
    if (role === "operator") return "operator";
    if (jabatan === "manager") return "manager";

    return "unknown";
  };

  const getWaitingStatusForLevel = (level) => {
    if (level === "manager") return "APPROVAL_1"; // menunggu manager
    if (level === "operator") return "APPROVAL_2"; // menunggu operator
    if (level === "admin") return "APPROVAL_3"; // menunggu admin
    return null;
  };

  // ===================== FETCH BOOKINGS =====================
  const fetchBookings = async (profile) => {
    const level = getMyLevel(profile);
    const statusNeed = getWaitingStatusForLevel(level);
    if (!statusNeed) return [];

    // ambil booking yg statusnya sesuai level
    let qSnap = query(collection(db, "vehicle_bookings"), where("status", "==", statusNeed));
    const snap = await getDocs(qSnap);

    const raw = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // ✅ filter manager hanya divisinya sendiri
    if (level === "manager") {
      const myDivisi = (profile.divisi || "").toLowerCase();
      return raw.filter((b) => (b.divisi || "").toLowerCase() === myDivisi);
    }

    // operator/admin bisa lihat semua (karena SDM)
    return raw;
  };

  // ===================== INIT =====================
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProfile();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!myProfile?.uid) return;
      setLoading(true);
      const data = await fetchBookings(myProfile);
      setBookings(data);
      setLoading(false);
    };
    run();
  }, [myProfile]);

  // ===================== FILTER UI =====================
  const filteredBookings = useMemo(() => {
    const key = keyword.toLowerCase();
    return bookings.filter((b) => {
      const text = `
        ${b.namaPeminjam || ""} 
        ${b.emailPeminjam || ""} 
        ${b.divisi || ""} 
        ${b.keperluan || ""} 
        ${b.tujuan || ""} 
        ${b.nomorSurat || ""} 
        ${b.vehicle?.nama || ""} 
        ${b.vehicle?.platNomor || ""}
      `.toLowerCase();

      return text.includes(key);
    });
  }, [bookings, keyword]);

  // ===================== APPROVE =====================
  const handleApprove = async (booking) => {
    if (saving) return;
    if (!myProfile) return;

    const level = getMyLevel(myProfile);
    const now = Timestamp.now();

    setSaving(true);

    try {
      const ref = doc(db, "vehicle_bookings", booking.id);

      const oldStatus = booking.status;
      let newStatus = booking.status;

      // ✅ manager approve: APPROVAL_1 -> APPROVAL_2
      if (level === "manager") newStatus = "APPROVAL_2";

      // ✅ operator approve: APPROVAL_2 -> APPROVAL_3
      if (level === "operator") newStatus = "APPROVAL_3";

      // ✅ admin approve: APPROVAL_3 -> APPROVED
      if (level === "admin") newStatus = "APPROVED";

      if (newStatus === oldStatus) {
        alert("Status tidak berubah (cek level kamu).");
        return;
      }

      await updateDoc(ref, {
        status: newStatus,
        updatedAt: now,

        lastApprovalBy: myProfile.nama || myProfile.email || "-",
        lastApprovalRole: myProfile.role || "-",
        lastApprovalJabatan: myProfile.jabatan || "-",
      });

      // ✅ simpan ke history
      await addVehicleHistory(booking.id, {
        action: "APPROVED",
        actionBy: myProfile.nama || myProfile.email || "-",
        actionRole: myProfile.role || "-",
        actionJabatan: myProfile.jabatan || "-",
        userId: myProfile.uid,
        oldStatus,
        newStatus,
        note: `Disetujui oleh ${level}`,
        timestamp: now,
      });

      alert("✅ Berhasil approve!");

      // refresh list
      const data = await fetchBookings(myProfile);
      setBookings(data);
    } catch (err) {
      alert("❌ Gagal approve: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ===================== REJECT =====================
  const openRejectModal = (booking) => {
    setSelectedBooking(booking);
    setRejectNote("");
    setOpenReject(true);
  };

  const submitReject = async () => {
    if (!selectedBooking) return;
    if (!rejectNote.trim()) {
      alert("Alasan reject wajib diisi!");
      return;
    }
    if (!myProfile) return;
    if (saving) return;

    const level = getMyLevel(myProfile);
    const now = Timestamp.now();

    setSaving(true);

    try {
      const ref = doc(db, "vehicle_bookings", selectedBooking.id);

      const oldStatus = selectedBooking.status;
      const newStatus = "REJECTED";

      await updateDoc(ref, {
        status: newStatus,
        alasan: rejectNote.trim(),
        updatedAt: now,

        lastApprovalBy: myProfile.nama || myProfile.email || "-",
        lastApprovalRole: myProfile.role || "-",
        lastApprovalJabatan: myProfile.jabatan || "-",
      });

      await addVehicleHistory(selectedBooking.id, {
        action: "REJECTED",
        actionBy: myProfile.nama || myProfile.email || "-",
        actionRole: myProfile.role || "-",
        actionJabatan: myProfile.jabatan || "-",
        userId: myProfile.uid,
        oldStatus,
        newStatus,
        note: rejectNote.trim(),
        timestamp: now,
      });

      alert("❌ Booking ditolak.");

      setOpenReject(false);
      setSelectedBooking(null);

      // refresh
      const data = await fetchBookings(myProfile);
      setBookings(data);
    } catch (err) {
      alert("❌ Gagal reject: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ===================== UI =====================
  const level = getMyLevel(myProfile);

  if (loading) {
    return (
      <AdminLayout>
        <div className="approvalv-page">
          <h2>Approval Kendaraan</h2>
          <p style={{ marginTop: 10 }}>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!myProfile) {
    return (
      <AdminLayout>
        <div className="approvalv-page">
          <h2>Approval Kendaraan</h2>
          <p style={{ marginTop: 10 }}>Profile tidak ditemukan</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="approvalv-page">
        {/* HEADER */}
        <div className="approvalv-header">
          <div>
            <h2>Approval Kendaraan</h2>
            <p className="sub">
              Level: <b>{level}</b> • Menampilkan pengajuan sesuai tahap kamu
            </p>
          </div>

          <div className="approvalv-actions">
            <input className="search-input" placeholder="Cari peminjam / kendaraan / plat / tujuan / divisi..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>

        {/* LIST */}
        <div className="approvalv-grid">
          {filteredBookings.length === 0 ? (
            <div className="empty-card">Tidak ada pengajuan menunggu approval ✅</div>
          ) : (
            filteredBookings.map((b) => (
              <div className="booking-card" key={b.id}>
                <div className="booking-top">
                  <div className="booking-title">
                    <h3>{b.vehicle?.nama || "-"}</h3>
                    <span className={`badge-status ${b.status}`}>{b.status}</span>
                  </div>

                  <p className="booking-room">
                    🚗 {b.vehicle?.platNomor || "-"}{" "}
                    <span className="muted">
                      ({b.vehicle?.jenis || "-"} • {b.vehicle?.tahun || "-"})
                    </span>
                  </p>
                </div>

                <div className="booking-info">
                  <div className="info-item">
                    <span className="label">Peminjam</span>
                    <span className="value">{b.namaPeminjam || b.emailPeminjam || "-"}</span>
                  </div>

                  <div className="info-item">
                    <span className="label">Divisi</span>
                    <span className="value">{b.divisi || "-"}</span>
                  </div>

                  <div className="info-item">
                    <span className="label">Keperluan</span>
                    <span className="value">{b.keperluan || "-"}</span>
                  </div>

                  <div className="info-item">
                    <span className="label">Tujuan</span>
                    <span className="value">{b.tujuan || "-"}</span>
                  </div>

                  <div className="info-item full">
                    <span className="label">Waktu</span>
                    <span className="value">
                      {b.waktuPinjam?.toDate?.().toLocaleString?.() || "-"} s/d {b.waktuKembali?.toDate?.().toLocaleString?.() || "-"}
                    </span>
                  </div>

                  <div className="info-item full">
                    <span className="label">Nomor Surat</span>
                    <span className="value">{b.nomorSurat || "-"}</span>
                  </div>

                  <div className="info-item full">
                    <span className="label">Last Approval</span>
                    <span className="value">
                      {b.lastApprovalBy || "-"} • {b.lastApprovalRole || "-"} • {b.lastApprovalJabatan || "-"}
                    </span>
                  </div>

                  <div className="info-item full">
                    <span className="label">Alasan</span>
                    <span className="value">{b.alasan || "-"}</span>
                  </div>
                </div>

                <div className="booking-footer">
                  <button className="btn-approve" disabled={saving} onClick={() => handleApprove(b)}>
                    ✅ Approve
                  </button>

                  <button className="btn-reject" disabled={saving} onClick={() => openRejectModal(b)}>
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL REJECT */}
        {openReject && (
          <div className="modal-overlay" onClick={() => setOpenReject(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3>Alasan Penolakan</h3>
              <p className="sub">
                Kendaraan: <b>{selectedBooking?.vehicle?.nama || "-"}</b>
              </p>

              <textarea className="reject-textarea" placeholder="Tulis alasan reject..." value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setOpenReject(false)}>
                  Batal
                </button>
                <button className="btn-reject" disabled={saving} onClick={submitReject}>
                  {saving ? "Menyimpan..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default AdminApprovalKendaraanPage;
