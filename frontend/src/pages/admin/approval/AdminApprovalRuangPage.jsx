import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where, Timestamp } from "firebase/firestore";
import { auth, db } from "../../../firebase";

import AdminLayout from "../../../components/admin/AdminLayout";
import "./AdminApprovalRuangPage.css";

function AdminApprovalRuangPage() {
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState([]);
  const [keyword, setKeyword] = useState("");

  // modal reject
  const [openReject, setOpenReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    if (!auth.currentUser) return;

    const ref = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setMyProfile({ uid: snap.id, ...snap.data() });
    }
  };

  const getWaitingStatusByRole = (role) => {
    if (role === "manager") return "WAITING_MANAGER";
    if (role === "operator") return "WAITING_OPERATOR";
    if (role === "admin") return "WAITING_ADMIN";
    return null;
  };

  const fetchBookings = async (role, uid) => {
    const waitingStatus = getWaitingStatusByRole(role);
    if (!waitingStatus) return [];

    const q = query(collection(db, "room_bookings"), where("status", "==", waitingStatus));
    const snap = await getDocs(q);

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // 🔥 filter sesuai approver
    // manager hanya lihat yang approval.manager.uid = dirinya
    // operator hanya lihat yang approval.operator.uid = dirinya
    // admin hanya lihat yang approval.admin.uid = dirinya
    const filtered = data.filter((b) => {
      if (!b.approval) return false;
      if (role === "manager") return b.approval.manager?.uid === uid;
      if (role === "operator") return b.approval.operator?.uid === uid;
      if (role === "admin") return b.approval.admin?.uid === uid;
      return false;
    });

    return filtered;
  };

  const fetchRoomsForSnapshot = async (roomId) => {
    try {
      const roomRef = doc(db, "rooms", roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch {
      return null;
    }
  };

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
      if (!myProfile?.role || !myProfile?.uid) return;
      setLoading(true);

      const data = await fetchBookings(myProfile.role, myProfile.uid);

      // ✅ optional: ambil nama ruangan biar UI cantik (karena booking hanya simpan roomId)
      const enriched = await Promise.all(
        data.map(async (b) => {
          const roomId = b.ruang?.roomId;
          if (!roomId) return b;

          const roomData = await fetchRoomsForSnapshot(roomId);

          return {
            ...b,
            ruangSnapshot: roomData
              ? {
                  namaRuang: roomData.namaRuang,
                  lokasi: roomData.lokasi,
                  kapasitas: roomData.kapasitas,
                  tipe: roomData.tipe,
                }
              : null,
          };
        }),
      );

      setBookings(enriched);
      setLoading(false);
    };

    run();
  }, [myProfile]);

  // ============ FILTER ============
  const filteredBookings = useMemo(() => {
    const key = keyword.toLowerCase();

    return bookings.filter((b) => {
      const roomName = b.ruangSnapshot?.namaRuang || "";
      const peminjamNama = b.peminjam?.nama || "";
      const peminjamDivisi = b.peminjam?.divisi || "";
      const kegiatan = b.namaKegiatan || "";

      const text = `${roomName} ${peminjamNama} ${peminjamDivisi} ${kegiatan} ${b.jenisRapat || ""}`.toLowerCase();
      return text.includes(key);
    });
  }, [bookings, keyword]);

  // ============ APPROVE ============
  const handleApprove = async (booking) => {
    if (saving) return;
    if (!myProfile) return;

    setSaving(true);

    try {
      const ref = doc(db, "room_bookings", booking.id);

      const now = Timestamp.now();

      // manager approve → naik jadi WAITING_OPERATOR
      if (myProfile.role === "manager") {
        await updateDoc(ref, {
          "approval.manager.status": "APPROVED",
          "approval.manager.approvedAt": now,
          status: "WAITING_OPERATOR",
          updatedAt: now,
        });
      }

      // operator approve → naik jadi WAITING_ADMIN
      if (myProfile.role === "operator") {
        await updateDoc(ref, {
          "approval.operator.status": "APPROVED",
          "approval.operator.approvedAt": now,
          status: "WAITING_ADMIN",
          updatedAt: now,
        });
      }

      // admin approve → FINAL APPROVED
      if (myProfile.role === "admin") {
        await updateDoc(ref, {
          "approval.admin.status": "APPROVED",
          "approval.admin.approvedAt": now,
          status: "APPROVED",
          updatedAt: now,
        });
      }

      alert("✅ Berhasil Approve!");
      // refresh list
      const data = await fetchBookings(myProfile.role, myProfile.uid);
      setBookings(data);
    } catch (err) {
      alert("❌ Gagal approve: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ============ REJECT ============
  const openRejectModal = (booking) => {
    setSelectedBooking(booking);
    setRejectNote("");
    setOpenReject(true);
  };

  const submitReject = async () => {
    if (!selectedBooking) return;
    if (!rejectNote.trim()) {
      alert("Alasan penolakan wajib diisi!");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const ref = doc(db, "room_bookings", selectedBooking.id);
      const now = Timestamp.now();

      if (myProfile.role === "manager") {
        await updateDoc(ref, {
          "approval.manager.status": "REJECTED",
          "approval.manager.approvedAt": now,
          "approval.manager.note": rejectNote.trim(),
          status: "REJECTED",
          rejectedBy: "MANAGER",
          rejectedNote: rejectNote.trim(),
          updatedAt: now,
        });
      }

      if (myProfile.role === "operator") {
        await updateDoc(ref, {
          "approval.operator.status": "REJECTED",
          "approval.operator.approvedAt": now,
          "approval.operator.note": rejectNote.trim(),
          status: "REJECTED",
          rejectedBy: "OPERATOR",
          rejectedNote: rejectNote.trim(),
          updatedAt: now,
        });
      }

      if (myProfile.role === "admin") {
        await updateDoc(ref, {
          "approval.admin.status": "REJECTED",
          "approval.admin.approvedAt": now,
          "approval.admin.note": rejectNote.trim(),
          status: "REJECTED",
          rejectedBy: "ADMIN",
          rejectedNote: rejectNote.trim(),
          updatedAt: now,
        });
      }

      alert("❌ Pengajuan ditolak.");
      setOpenReject(false);
      setSelectedBooking(null);

      // refresh list
      const data = await fetchBookings(myProfile.role, myProfile.uid);
      setBookings(data);
    } catch (err) {
      alert("❌ Gagal reject: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (ts) => {
    try {
      return ts?.toDate().toLocaleString();
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="approval-page">
          <h2>Approval Ruang</h2>
          <p style={{ marginTop: 10 }}>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!myProfile) {
    return (
      <AdminLayout>
        <div className="approval-page">
          <h2>Approval Ruang</h2>
          <p style={{ marginTop: 10 }}>Profile tidak ditemukan</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="approval-page">
        {/* HEADER */}
        <div className="approval-header">
          <div>
            <h2>Approval Ruang</h2>
            <p className="sub">
              Role: <b>{myProfile.role}</b> • Menampilkan pengajuan yang menunggu approval kamu
            </p>
          </div>

          <div className="approval-actions">
            <input className="search-input" placeholder="Cari kegiatan / ruangan / divisi / peminjam..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>

        {/* LIST */}
        <div className="approval-grid">
          {filteredBookings.length === 0 ? (
            <div className="empty-card">Tidak ada pengajuan menunggu approval.</div>
          ) : (
            filteredBookings.map((b) => (
              <div className="booking-card" key={b.id}>
                <div className="booking-top">
                  <div className="booking-title">
                    <h3>{b.namaKegiatan || "-"}</h3>
                    <span className={`badge-status ${b.status}`}>{b.status}</span>
                  </div>

                  <p className="booking-room">
                    🏢 {b.ruangSnapshot?.namaRuang || b.ruang?.roomId || "-"} <span className="muted">({b.ruangSnapshot?.lokasi || "-"})</span>
                  </p>
                </div>

                <div className="booking-info">
                  <div className="info-item">
                    <span className="label">Tanggal</span>
                    <span className="value">{formatTime(b.waktuMulai)}</span>
                  </div>

                  <div className="info-item">
                    <span className="label">Selesai</span>
                    <span className="value">{formatTime(b.waktuSelesai)}</span>
                  </div>

                  <div className="info-item">
                    <span className="label">Jenis</span>
                    <span className="value">{b.jenisRapat || "-"}</span>
                  </div>

                  <div className="info-item">
                    <span className="label">Peserta</span>
                    <span className="value">{b.peserta || "-"}</span>
                  </div>

                  <div className="info-item full">
                    <span className="label">Peminjam</span>
                    <span className="value">
                      {b.peminjam?.nama || b.peminjam?.email || "-"} • <span className="muted">{b.peminjam?.divisi || "-"}</span>
                    </span>
                  </div>

                  <div className="info-item full">
                    <span className="label">Konsumsi</span>
                    <span className="value">{Array.isArray(b.konsumsi) ? b.konsumsi.join(", ") : "-"}</span>
                  </div>

                  <div className="info-item full">
                    <span className="label">Dekorasi</span>
                    <span className="value">{b.dekorasi || "-"}</span>
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
                Pengajuan: <b>{selectedBooking?.namaKegiatan || "-"}</b>
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

export default AdminApprovalRuangPage;
