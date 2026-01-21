import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where, Timestamp, runTransaction } from "firebase/firestore";
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

  // ===================== LEVEL LOGIC =====================
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

      return { id: snap.id, ...snap.data() };
    } catch {
      return null;
    }
  };

  // ===================== CHECK CONFLICT (ANTI DOUBLE BOOKING) =====================
  const hasScheduleConflict = async (booking) => {
    const roomId = booking?.ruang?.roomId;
    if (!roomId) return false;

    const start = booking.waktuMulai?.toDate?.();
    const end = booking.waktuSelesai?.toDate?.();
    if (!start || !end) return false;

    // ambil yang sudah final approved
    const q = query(collection(db, "room_bookings"), where("ruang.roomId", "==", roomId), where("status", "==", "APPROVED"));

    const snap = await getDocs(q);

    const isOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

    for (const docSnap of snap.docs) {
      if (docSnap.id === booking.id) continue;

      const other = docSnap.data();
      const oStart = other.waktuMulai?.toDate?.();
      const oEnd = other.waktuSelesai?.toDate?.();

      if (!oStart || !oEnd) continue;

      if (isOverlap(start, end, oStart, oEnd)) {
        return true;
      }
    }

    return false;
  };

  // ===================== FETCH BOOKINGS =====================
  const fetchBookings = async (profile) => {
    const level = getMyApprovalLevel(profile);
    const waitingStatus = getWaitingStatus(profile);

    if (!waitingStatus) return [];

    const q = query(collection(db, "room_bookings"), where("status", "==", waitingStatus));
    const snap = await getDocs(q);

    const raw = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // ✅ filtering rules:
    // - manager: hanya booking yg approval.manager.uid == dirinya
    // - operator/admin: tampil semua waiting list
    let filtered = raw;

    if (level === "manager") {
      filtered = raw.filter((b) => b.approval?.manager?.uid === profile.uid);
    }

    // ✅ enrich snapshot room
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

  // ===================== FILTER =====================
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
      const bookingRef = doc(db, "room_bookings", booking.id);

      await runTransaction(db, async (tx) => {
        // 1) ambil booking terbaru
        const bookingSnap = await tx.get(bookingRef);
        if (!bookingSnap.exists()) throw new Error("Booking tidak ditemukan");

        const b = { id: bookingSnap.id, ...bookingSnap.data() };

        // ✅ validasi status sesuai tahap
        if (level === "manager" && b.status !== "WAITING_MANAGER") {
          throw new Error("Booking ini sudah diproses / bukan waiting manager.");
        }
        if (level === "operator" && b.status !== "WAITING_OPERATOR") {
          throw new Error("Booking ini belum di-approve manager.");
        }
        if (level === "admin" && b.status !== "WAITING_ADMIN") {
          throw new Error("Booking ini belum di-approve operator.");
        }

        const roomId = b?.ruang?.roomId;
        if (!roomId) throw new Error("RoomId tidak valid");

        const start = b.waktuMulai?.toDate?.();
        const end = b.waktuSelesai?.toDate?.();
        if (!start || !end) throw new Error("Waktu booking tidak valid");

        const isOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

        // ============================
        // ✅ KETAT + AUTO REJECT DI OPERATOR
        // ============================
        if (level === "operator") {
          // Cari booking lain yang masih "bisa bentrok"
          // kita ambil yang statusnya masih aktif dalam proses:
          // WAITING_OPERATOR, WAITING_ADMIN, APPROVED
          const qAll = query(collection(db, "room_bookings"), where("ruang.roomId", "==", roomId));

          const snapAll = await getDocs(qAll);

          // 1) cek dulu apakah booking ini bentrok dengan yang sudah lock (WAITING_ADMIN / APPROVED)
          const lockedStatuses = new Set(["WAITING_ADMIN", "APPROVED"]);

          for (const docSnap of snapAll.docs) {
            if (docSnap.id === b.id) continue;

            const other = docSnap.data();
            if (!lockedStatuses.has(other.status)) continue;

            const oStart = other.waktuMulai?.toDate?.();
            const oEnd = other.waktuSelesai?.toDate?.();
            if (!oStart || !oEnd) continue;

            if (isOverlap(start, end, oStart, oEnd)) {
              throw new Error("Bentrok jadwal! Sudah ada booking lain yang lolos operator / sudah approved.");
            }
          }

          // 2) Jika aman, APPROVE booking ini → jadi WAITING_ADMIN
          tx.update(bookingRef, {
            "approval.operator.status": "APPROVED",
            "approval.operator.approvedAt": now,
            status: "WAITING_ADMIN",
            updatedAt: now,
          });

          // 3) AUTO REJECT semua booking lain yang bentrok dan masih waiting
          for (const docSnap of snapAll.docs) {
            if (docSnap.id === b.id) continue;

            const other = docSnap.data();

            // yang boleh di auto reject = yang masih menunggu (belum lock)
            // biasanya WAITING_OPERATOR (karena tahap operator)
            if (other.status !== "WAITING_OPERATOR") continue;

            const oStart = other.waktuMulai?.toDate?.();
            const oEnd = other.waktuSelesai?.toDate?.();
            if (!oStart || !oEnd) continue;

            if (isOverlap(start, end, oStart, oEnd)) {
              const otherRef = doc(db, "room_bookings", docSnap.id);

              tx.update(otherRef, {
                status: "REJECTED",
                rejectedBy: "SYSTEM_OPERATOR_LOCK",
                rejectedNote: "Auto reject: jadwal bentrok karena booking lain sudah di-approve operator.",
                updatedAt: now,

                // isi approval operator agar terlihat jelas kenapa ditolak
                "approval.operator.status": "REJECTED",
                "approval.operator.approvedAt": now,
                "approval.operator.note": "Auto reject karena bentrok jadwal setelah operator approve booking lain.",

                // admin tidak perlu proses lagi
                "approval.admin.status": "CANCELLED",
              });
            }
          }

          // ✅ selesai operator flow (return biar tidak lanjut ke bawah)
          return;
        }

        // ============================
        // ✅ MANAGER APPROVE
        // ============================
        if (level === "manager") {
          tx.update(bookingRef, {
            "approval.manager.status": "APPROVED",
            "approval.manager.approvedAt": now,
            status: "WAITING_OPERATOR",
            updatedAt: now,
          });
          return;
        }

        // ============================
        // ✅ ADMIN FINAL APPROVE
        // ============================
        if (level === "admin") {
          tx.update(bookingRef, {
            "approval.admin.status": "APPROVED",
            "approval.admin.approvedAt": now,
            status: "APPROVED",
            updatedAt: now,
          });
          return;
        }
      });

      alert("✅ Berhasil Approve!");

      const data = await fetchBookings(myProfile);
      setBookings(data);
    } catch (err) {
      alert("❌ " + err.message);
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

          // rapihin yang lain
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
