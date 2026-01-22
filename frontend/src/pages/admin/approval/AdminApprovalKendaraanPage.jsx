import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where, Timestamp, runTransaction } from "firebase/firestore";
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
    if (level === "manager") return "APPROVAL_1";
    if (level === "operator") return "APPROVAL_2";
    if (level === "admin") return "APPROVAL_3";
    return null;
  };

  // ===================== FETCH BOOKINGS =====================
  const fetchBookings = async (profile) => {
    const level = getMyLevel(profile);
    const statusNeed = getWaitingStatusForLevel(level);
    if (!statusNeed) return [];

    const qSnap = query(collection(db, "vehicle_bookings"), where("status", "==", statusNeed));
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

  // ===================== HELPERS =====================
  const isOverlap = (startA, endA, startB, endB) => {
    return startA < endB && endA > startB;
  };

  // ===================== APPROVE (WITH AUTO REJECT BENTROK AT OPERATOR) =====================
  const handleApprove = async (booking) => {
    if (saving) return;
    if (!myProfile) return;

    const level = getMyLevel(myProfile);
    const now = Timestamp.now();

    setSaving(true);

    try {
      const bookingRef = doc(db, "vehicle_bookings", booking.id);

      // ✅ status transition
      const oldStatus = booking.status;
      let newStatus = booking.status;

      if (level === "manager") newStatus = "APPROVAL_2";
      if (level === "operator") newStatus = "APPROVAL_3";
      if (level === "admin") newStatus = "APPROVED";

      if (newStatus === oldStatus) {
        alert("Status tidak berubah (cek level kamu).");
        return;
      }

      // ==========================================================
      // 🔥 KHUSUS OPERATOR: approve 1, auto reject yang bentrok
      // ==========================================================
      if (level === "operator") {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(bookingRef);
          if (!snap.exists()) throw new Error("Booking tidak ditemukan");

          const fresh = { id: snap.id, ...snap.data() };

          // ✅ pastikan status masih APPROVAL_2
          if (fresh.status !== "APPROVAL_2") {
            throw new Error("Booking ini sudah berubah status (refresh halaman).");
          }

          const vehicleId = fresh.vehicle?.vehicleId;
          const start = fresh.waktuPinjam?.toDate?.();
          const end = fresh.waktuKembali?.toDate?.();

          if (!vehicleId || !start || !end) {
            throw new Error("Data waktu/vehicleId tidak lengkap");
          }

          // ✅ ambil kandidat booking lain yg berpotensi bentrok
          // kita ambil status "aktif" selain REJECTED/COMPLETED
          const qAll = query(collection(db, "vehicle_bookings"), where("vehicle.vehicleId", "==", vehicleId));
          const allSnap = await getDocs(qAll);

          const willReject = [];

          allSnap.docs.forEach((d) => {
            if (d.id === fresh.id) return;

            const b = d.data();
            const st = b.status;

            // hanya yang masih bisa bentrok / masih hidup
            const BLOCKING = ["APPROVAL_1", "APPROVAL_2", "APPROVAL_3", "APPROVED", "ON_GOING", "SUBMITTED"];
            if (!BLOCKING.includes(st)) return;

            const bStart = b.waktuPinjam?.toDate?.();
            const bEnd = b.waktuKembali?.toDate?.();

            if (!bStart || !bEnd) return;

            if (isOverlap(start, end, bStart, bEnd)) {
              willReject.push({ id: d.id, ...b });
            }
          });

          // ✅ 1) approve booking terpilih
          tx.update(bookingRef, {
            status: "APPROVAL_3",
            updatedAt: now,
            lastApprovalBy: myProfile.nama || myProfile.email || "-",
            lastApprovalRole: myProfile.role || "-",
            lastApprovalJabatan: myProfile.jabatan || "-",
          });

          // ✅ 2) auto reject semua yang bentrok
          willReject.forEach((b) => {
            const refB = doc(db, "vehicle_bookings", b.id);
            tx.update(refB, {
              status: "REJECTED",
              alasan: "Booking ditolak otomatis karena bentrok jadwal dengan booking lain yang disetujui Operator.",
              rejectedBy: "OPERATOR",
              rejectedNote: "AUTO_REJECT_BENTROK",
              updatedAt: now,
              lastApprovalBy: myProfile.nama || myProfile.email || "-",
              lastApprovalRole: myProfile.role || "-",
              lastApprovalJabatan: myProfile.jabatan || "-",
            });
          });
        });

        // ✅ history untuk booking yang di-approve
        await addVehicleHistory(booking.id, {
          action: "APPROVED",
          actionBy: myProfile.nama || myProfile.email || "-",
          actionRole: myProfile.role || "-",
          actionJabatan: myProfile.jabatan || "-",
          userId: myProfile.uid,
          oldStatus,
          newStatus: "APPROVAL_3",
          note: "Disetujui oleh operator + auto reject booking bentrok",
          timestamp: now,
        });

        alert("✅ Approve berhasil! Booking bentrok otomatis ditolak.");
      } else {
        // ===================== NORMAL APPROVE (MANAGER / ADMIN) =====================
        await updateDoc(bookingRef, {
          status: newStatus,
          updatedAt: now,
          lastApprovalBy: myProfile.nama || myProfile.email || "-",
          lastApprovalRole: myProfile.role || "-",
          lastApprovalJabatan: myProfile.jabatan || "-",
        });

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
      }

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

        rejectedBy: level.toUpperCase(),
        rejectedNote: rejectNote.trim(),

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
