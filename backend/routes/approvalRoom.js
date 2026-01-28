const express = require("express");
const router = express.Router();

const admin = require("firebase-admin");
const db = admin.firestore();
function toWIBISOString(timestamp) {
  return new Date(
    timestamp.toDate().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    }),
  ).toISOString();
}
const formatWIB = (ts) =>
  ts.toDate().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
// ✅ IMPORT SEMUA FUNGSI YANG DIBUTUHKAN
const { createApprovalToken, verifyApprovalToken, markTokenUsed } = require("../services/tokenService");
const { sendWhatsApp } = require("../services/waService");

// kirim WA ke manager
router.post("/approval/room/manager/send", async (req, res) => {
  try {
    const { bookingId } = req.body;

    const bookingRef = db.collection("room_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();
    const manager = booking.approval.manager;

    if (!manager?.email) throw new Error("Manager belum ada");

    const phoneNumber = String(manager.noTelp || "").trim();

    if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
      throw new Error("Manager tidak memiliki nomor telepon yang valid");
    }

    console.log("📞 Manager Phone:", phoneNumber);

    // 🔑 buat token
    const token = await createApprovalToken({ bookingId });

    // 🔗 link approval
    const link = `https://pintra-pelindo.web.app/approval/room?bookingId=${bookingId}&token=${token}`;

    // 📲 kirim WA
    await sendWhatsApp({
      phone: phoneNumber,
      message: `*APPROVAL PEMINJAMAN RUANG*

Yth. ${manager.nama},

📋 *Detail Peminjaman*
- Kegiatan: ${booking.namaKegiatan}
- Divisi: ${booking.peminjam.divisi}
- Peserta: ${booking.peserta}

📅 *Jadwal*
- ${formatWIB(booking.waktuMulai)} 
- s/d ${formatWIB(booking.waktuSelesai)}

👉 *Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
    });

    console.log("✅ WA berhasil dikirim ke:", phoneNumber);
    res.json({ success: true, message: "WA berhasil dikirim" });
  } catch (err) {
    console.error("❌ ERROR SEND WA:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ VERIFY TOKEN - ENDPOINT BARU
router.get("/approval/room/verify", async (req, res) => {
  try {
    const { bookingId, token } = req.query;

    if (!bookingId || !token) {
      throw new Error("Parameter tidak lengkap");
    }

    // Verifikasi token
    await verifyApprovalToken({ bookingId, token });

    // Ambil data booking
    const bookingRef = db.collection("room_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();

    res.json({
      namaKegiatan: booking.namaKegiatan,
      peminjam: booking.peminjam,
      peserta: booking.peserta,
      waktuMulai: toWIBISOString(booking.waktuMulai),
      waktuSelesai: toWIBISOString(booking.waktuSelesai),
    });
  } catch (err) {
    console.error("❌ VERIFY ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ ACTION (APPROVE / REJECT) - ENDPOINT BARU
router.post("/approval/room/action", async (req, res) => {
  try {
    const { bookingId, token, action } = req.body;

    if (!bookingId || !token || !action) {
      throw new Error("Parameter tidak lengkap");
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      throw new Error("Action tidak valid");
    }

    // Verifikasi token
    const { tokenDocId } = await verifyApprovalToken({ bookingId, token });

    // Update booking
    const bookingRef = db.collection("room_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const now = admin.firestore.Timestamp.now();

    if (action === "APPROVE") {
      await bookingRef.update({
        "approval.manager.status": "APPROVED",
        "approval.manager.approvedAt": now,
        status: "WAITING_OPERATOR",
      });
    } else {
      await bookingRef.update({
        "approval.manager.status": "REJECTED",
        "approval.manager.approvedAt": now,
        status: "REJECTED",
      });
    }

    // Tandai token sudah digunakan
    await markTokenUsed(tokenDocId);

    res.json({ success: true, message: `Booking ${action}D` });
  } catch (err) {
    console.error("❌ ACTION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
