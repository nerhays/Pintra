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

  // ===================== PROFILE =====================
  const fetchProfile = async () => {
    if (!auth.currentUser) return;

    const ref = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setMyProfile({ uid: snap.id, ...snap.data() });
    }
  };

  // ===================== STATUS BY APPROVER =====================
  const getMyApprovalLevel = (profile) => {
    const role = (profile?.role || "").toLowerCase();
    const jabatan = (profile?.jabatan || "").toLowerCase();

    // ✅ PRIORITAS ROLE
    if (role === "admin") return "admin";
    if (role === "operator") return "operator";

    // ✅ baru jabatan untuk manager approval
    if (jabatan === "manager") return "manager";

    return "unknown";
  };

  const getWaitingStatus = (profile) => {
    const level = getMyApprovalLevel(profile);

    if (level === "manager") return "WAITING_MANAGER";
    if (level === "operator") return "WAITING_OPERATOR";
    if (level === "admin") return "WAITING_ADMIN";

    return null;
  };

  // ===================== ROOM SNAPSHOT =====================
  const fetchRoomSnapshot = async (roomId) => {
    try {
      const roomRef = doc(db, "rooms", roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return null;

      return {
        id: snap.id,
        ...snap.data(),
      };
    } catch {
      return null;
    }
  };

  // ===================== FETCH BOOKINGS =====================
  const fetchBookings = async (profile) => {
    const level = getMyApprovalLevel(profile);
    const waitingStatus = getWaitingStatus(profile);

    if (!waitingStatus) return [];

    // ambil berdasarkan status waiting
    const q = query(collection(db, "room_bookings"), where("status", "==", waitingStatus));
    const snap = await getDocs(q);

    const raw = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // ✅ filtering rules:
    // - manager: wajib sesuai approval.manager.uid
    // - operator/admin: tampil semua waiting list (simple, sesuai kebutuhanmu)
    let filtered = raw;

    if (level === "manager") {
      filtered = raw.filter((b) => b.approval?.manager?.uid === profile.uid);
    }

    // ✅ enrich room snapshot (biar nama ruang muncul)
    const enriched = await Promise.all(
      filtered.map(async (b) => {
        const roomId = b.ruang?.roomId;
        if (!roomId) return b;

        const room = await fetchRoomSnapshot(roomId);
        return {
          ...b,
          ruangSnapshot: room
            ? {
                namaRuang: room.namaRuang,
                lokasi: room.lokasi,
                kapasitas: room.kapasitas,
                tipe: room.tipe,
              }
            : null,
        };
      }),
    );

    return enriched;
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

  // ===================== LOAD LIST =====================
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
      const roomName = b.ruangSnapshot?.namaRuang || "";
      const kegiatan = b.namaKegiatan || "";
      const jenis = b.jenisRapat || "";

      const peminjamNama = b.peminjam?.nama || "";
      const peminjamEmail = b.peminjam?.email || "";
      const peminjamDivisi = b.peminjam?.divisi || "";

      const text = `${roomName} ${kegiatan} ${jenis} ${peminjamNama} ${peminjamEmail} ${peminjamDivisi}`.toLowerCase();

      return text.includes(key);
    });
  }, [bookings, keyword]);

  // ===================== APPROVE =====================
  const handleApprove = async (booking) => {
    if (saving) return;
    if (!myProfile) return;

    const level = getMyApprovalLevel(myProfile);
    const now = Timestamp.now();

    setSaving(true);

    try {
      const ref = doc(db, "room_bookings", booking.id);

      // MANAGER -> WAITING_OPERATOR
      if (level === "manager") {
        await updateDoc(ref, {
          "approval.manager.status": "APPROVED",
          "approval.manager.approvedAt": now,
          status: "WAITING_OPERATOR",
          updatedAt: now,
        });
      }

      // OPERATOR -> WAITING_ADMIN
      if (level === "operator") {
        await updateDoc(ref, {
          "approval.operator.status": "APPROVED",
          "approval.operator.approvedAt": now,
          status: "WAITING_ADMIN",
          updatedAt: now,
        });
      }

      // ADMIN -> FINAL APPROVED
      if (level === "admin") {
        await updateDoc(ref, {
          "approval.admin.status": "APPROVED",
          "approval.admin.approvedAt": now,
          status: "APPROVED",
          updatedAt: now,
        });
      }

      alert("✅ Berhasil Approve!");

      // refresh
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
      alert("Alasan penolakan wajib diisi!");
      return;
    }

    if (saving) return;

    const level = getMyApprovalLevel(myProfile);
    const now = Timestamp.now();

    setSaving(true);

    try {
      const ref = doc(db, "room_bookings", selectedBooking.id);

      // ✅ payload dasar untuk semua reject
      const baseReject = {
        status: "REJECTED",
        rejectedBy: level.toUpperCase(),
        rejectedNote: rejectNote.trim(),
        updatedAt: now,
      };

      if (level === "manager") {
        await updateDoc(ref, {
          ...baseReject,

          "approval.manager.status": "REJECTED",
          "approval.manager.approvedAt": now,
          "approval.manager.note": rejectNote.trim(),

          // ✅ cancel yang lain biar rapih
          "approval.operator.status": "CANCELLED",
          "approval.admin.status": "CANCELLED",
        });
      }

      if (level === "operator") {
        await updateDoc(ref, {
          ...baseReject,

          "approval.operator.status": "REJECTED",
          "approval.operator.approvedAt": now,
          "approval.operator.note": rejectNote.trim(),

          // ✅ cancel admin
          "approval.admin.status": "CANCELLED",
        });
      }

      if (level === "admin") {
        await updateDoc(ref, {
          ...baseReject,

          "approval.admin.status": "REJECTED",
          "approval.admin.approvedAt": now,
          "approval.admin.note": rejectNote.trim(),
        });
      }

      alert("❌ Pengajuan ditolak.");

      setOpenReject(false);
      setSelectedBooking(null);

      // refresh list
      const data = await fetchBookings(myProfile);
      setBookings(data);
    } catch (err) {
      alert("❌ Gagal reject: " + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ===================== FORMAT =====================
  const formatTime = (ts) => {
    try {
      return ts?.toDate().toLocaleString();
    } catch {
      return "-";
    }
  };

  // ===================== UI =====================
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

  const level = getMyApprovalLevel(myProfile);

  return (
    <AdminLayout>
      <div className="approval-page">
        {/* HEADER */}
        <div className="approval-header">
          <div>
            <h2>Approval Ruang</h2>
            <p className="sub">
              Level: <b>{level}</b> • Menampilkan pengajuan yang menunggu approval kamu
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
                    <span className="label">Mulai</span>
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
