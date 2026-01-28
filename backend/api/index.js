const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const app = express();
app.use(cors());
app.use(express.json());

const { createApprovalToken, verifyApprovalToken, markTokenUsed } = require("../services/tokenService");
const { sendWhatsApp } = require("../services/waService");

const db = admin.firestore();

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Backend Pintra jalan ✅" });
});

app.get("/api", (req, res) => {
  res.json({ message: "Backend Pintra jalan ✅" });
});

// Kirim WA ke manager
app.post("/api/approval/room/manager/send", async (req, res) => {
  try {
    const { bookingId } = req.body;
    const bookingRef = db.collection("room_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();
    const manager = booking.approval.manager;

    if (!manager || !manager.email) throw new Error("Manager belum ada");

    const phoneNumber = String(manager.noTelp || "").trim();

    if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
      throw new Error("Manager tidak memiliki nomor telepon yang valid");
    }

    const token = await createApprovalToken({ bookingId });
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
    const link = `${FRONTEND_URL}/approval/room?bookingId=${bookingId}&token=${token}`;

    await sendWhatsApp({
      phone: phoneNumber,
      message: `*APPROVAL PEMINJAMAN RUANG*

Yth. ${manager.nama},

📋 *Detail Peminjaman*
- Kegiatan: ${booking.namaKegiatan}
- Divisi: ${booking.peminjam.divisi}
- Peserta: ${booking.peserta}

📅 *Jadwal*
- ${booking.waktuMulai.toDate().toLocaleString("id-ID")} 
- s/d ${booking.waktuSelesai.toDate().toLocaleString("id-ID")}

👉 *Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
    });

    res.json({ success: true, message: "WA berhasil dikirim" });
  } catch (err) {
    console.error("ERROR SEND WA:", err);
    res.status(500).json({ error: err.message });
  }
});

// Verify token
app.get("/api/approval/room/verify", async (req, res) => {
  try {
    const { bookingId, token } = req.query;
    if (!bookingId || !token) throw new Error("Parameter tidak lengkap");

    await verifyApprovalToken({ bookingId, token });
    const bookingRef = db.collection("room_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();
    res.json({
      namaKegiatan: booking.namaKegiatan,
      peminjam: booking.peminjam,
      peserta: booking.peserta,
      waktuMulai: booking.waktuMulai,
      waktuSelesai: booking.waktuSelesai,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Action
// Action (Approve/Reject) - WITH DIRECT TRIGGER
app.post("/api/approval/room/action", async (req, res) => {
  try {
    const { bookingId, token, action } = req.body;
    if (!bookingId || !token || !action) throw new Error("Parameter tidak lengkap");
    if (!["APPROVE", "REJECT"].includes(action)) throw new Error("Action tidak valid");

    const { tokenDocId } = await verifyApprovalToken({ bookingId, token });
    const bookingRef = db.collection("room_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();
    const now = admin.firestore.Timestamp.now();
    const currentStatus = booking.status;

    if (action === "REJECT") {
      // Jika reject, langsung ubah status jadi REJECTED
      let field = "";
      if (currentStatus === "WAITING_MANAGER") field = "manager";
      else if (currentStatus === "WAITING_OPERATOR") field = "operator";
      else if (currentStatus === "WAITING_ADMIN") field = "admin";

      await bookingRef.update({
        [`approval.${field}.status`]: "REJECTED",
        [`approval.${field}.approvedAt`]: now,
        status: "REJECTED",
      });

      await markTokenUsed(tokenDocId);
      return res.json({ success: true, message: "Booking REJECTED" });
    }

    // APPROVE LOGIC
    if (currentStatus === "WAITING_MANAGER") {
      // Manager approve → trigger Operator
      await bookingRef.update({
        "approval.manager.status": "APPROVED",
        "approval.manager.approvedAt": now,
        status: "WAITING_OPERATOR",
      });

      // ✅ LANGSUNG KIRIM KE OPERATOR (tanpa setTimeout)
      try {
        console.log("🔄 Triggering Operator approval...");

        // Cari operator
        const operatorSnap = await db.collection("users").where("role", "==", "operator").limit(1).get();

        if (operatorSnap.empty) {
          console.error("❌ Operator tidak ditemukan");
          await markTokenUsed(tokenDocId);
          return res.json({
            success: true,
            message: "Manager approved, tapi Operator tidak ditemukan",
            warning: "Operator tidak ada di database",
          });
        }

        const operator = operatorSnap.docs[0].data();
        const operatorId = operatorSnap.docs[0].id;
        const phoneNumber = String(operator.noTelp || "").trim();

        console.log("📞 Operator found:", operator.nama, phoneNumber);

        if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
          console.error("❌ Operator tidak punya nomor telepon");
          await markTokenUsed(tokenDocId);
          return res.json({
            success: true,
            message: "Manager approved, tapi Operator tidak punya nomor telepon",
            warning: "Operator noTelp tidak valid",
          });
        }

        // Update operator info
        await bookingRef.update({
          "approval.operator.uid": operatorId,
          "approval.operator.nama": operator.nama || "-",
          "approval.operator.email": operator.email || "-",
          "approval.operator.status": "PENDING",
        });

        // Generate token & send WA
        const operatorToken = await createApprovalToken({ bookingId });
        const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
        const link = `${FRONTEND_URL}/approval/room?bookingId=${bookingId}&token=${operatorToken}&role=operator`;

        await sendWhatsApp({
          phone: phoneNumber,
          message: `*APPROVAL PEMINJAMAN RUANG*
*[TAHAP OPERATOR]*

Yth. ${operator.nama},

Manager telah menyetujui peminjaman ini. Mohon review untuk persiapan ruangan.

📋 *Detail Peminjaman*
- Kegiatan: ${booking.namaKegiatan}
- Divisi: ${booking.peminjam.divisi}
- Peserta: ${booking.peserta}

📅 *Jadwal*
- ${booking.waktuMulai.toDate().toLocaleString("id-ID")} 
- s/d ${booking.waktuSelesai.toDate().toLocaleString("id-ID")}

👉 *Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
        });

        console.log("✅ WA sent to Operator:", phoneNumber);
      } catch (err) {
        console.error("❌ Error sending to Operator:", err);
      }
    } else if (currentStatus === "WAITING_OPERATOR") {
      // Operator approve → trigger Admin
      await bookingRef.update({
        "approval.operator.status": "APPROVED",
        "approval.operator.approvedAt": now,
        status: "WAITING_ADMIN",
      });

      // ✅ LANGSUNG KIRIM KE ADMIN
      try {
        console.log("🔄 Triggering Admin approval...");

        // Cari admin
        const adminSnap = await db.collection("users").where("role", "==", "admin").limit(1).get();

        if (adminSnap.empty) {
          console.error("❌ Admin tidak ditemukan");
          await markTokenUsed(tokenDocId);
          return res.json({
            success: true,
            message: "Operator approved, tapi Admin tidak ditemukan",
            warning: "Admin tidak ada di database",
          });
        }

        const admin = adminSnap.docs[0].data();
        const adminId = adminSnap.docs[0].id;
        const phoneNumber = String(admin.noTelp || "").trim();

        console.log("📞 Admin found:", admin.nama, phoneNumber);

        if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
          console.error("❌ Admin tidak punya nomor telepon");
          await markTokenUsed(tokenDocId);
          return res.json({
            success: true,
            message: "Operator approved, tapi Admin tidak punya nomor telepon",
            warning: "Admin noTelp tidak valid",
          });
        }

        // Update admin info
        await bookingRef.update({
          "approval.admin.uid": adminId,
          "approval.admin.nama": admin.nama || "-",
          "approval.admin.email": admin.email || "-",
          "approval.admin.status": "PENDING",
        });

        // Generate token & send WA
        const adminToken = await createApprovalToken({ bookingId });
        const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
        const link = `${FRONTEND_URL}/approval/room?bookingId=${bookingId}&token=${adminToken}&role=admin`;

        await sendWhatsApp({
          phone: phoneNumber,
          message: `*APPROVAL PEMINJAMAN RUANG*
*[TAHAP ADMIN - FINAL]*

Yth. ${admin.nama},

Operator telah menyetujui peminjaman ini. Mohon approval final.

📋 *Detail Peminjaman*
- Kegiatan: ${booking.namaKegiatan}
- Divisi: ${booking.peminjam.divisi}
- Peserta: ${booking.peserta}

📅 *Jadwal*
- ${booking.waktuMulai.toDate().toLocaleString("id-ID")} 
- s/d ${booking.waktuSelesai.toDate().toLocaleString("id-ID")}

👉 *Final Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
        });

        console.log("✅ WA sent to Admin:", phoneNumber);
      } catch (err) {
        console.error("❌ Error sending to Admin:", err);
      }
    } else if (currentStatus === "WAITING_ADMIN") {
      // Admin approve → FINAL APPROVED
      await bookingRef.update({
        "approval.admin.status": "APPROVED",
        "approval.admin.approvedAt": now,
        status: "APPROVED",
      });
    }

    await markTokenUsed(tokenDocId);
    res.json({ success: true, message: `Booking ${action}D - Next level triggered` });
  } catch (err) {
    console.error("❌ ERROR ACTION:", err);
    res.status(400).json({ error: err.message });
  }
});
// ✅ KIRIM WA KE OPERATOR
app.post("/api/approval/room/operator/send", async (req, res) => {
  try {
    const { bookingId } = req.body;
    const bookingRef = db.collection("room_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();

    // Cari user dengan role operator
    const operatorSnap = await db.collection("users").where("role", "==", "operator").limit(1).get();

    if (operatorSnap.empty) throw new Error("Operator tidak ditemukan");

    const operator = operatorSnap.docs[0].data();
    const phoneNumber = String(operator.noTelp || "").trim();

    if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
      throw new Error("Operator tidak memiliki nomor telepon yang valid");
    }

    // Update operator info di booking
    await bookingRef.update({
      "approval.operator.uid": operatorSnap.docs[0].id,
      "approval.operator.nama": operator.nama || "-",
      "approval.operator.email": operator.email || "-",
      "approval.operator.status": "PENDING",
    });

    const token = await createApprovalToken({ bookingId });
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
    const link = `${FRONTEND_URL}/approval/room?bookingId=${bookingId}&token=${token}&role=operator`;

    await sendWhatsApp({
      phone: phoneNumber,
      message: `*APPROVAL PEMINJAMAN RUANG*
*[TAHAP OPERATOR]*

Yth. ${operator.nama},

Manager telah menyetujui peminjaman ini. Mohon review untuk persiapan ruangan.

📋 *Detail Peminjaman*
- Kegiatan: ${booking.namaKegiatan}
- Divisi: ${booking.peminjam.divisi}
- Peserta: ${booking.peserta}

📅 *Jadwal*
- ${booking.waktuMulai.toDate().toLocaleString("id-ID")} 
- s/d ${booking.waktuSelesai.toDate().toLocaleString("id-ID")}

👉 *Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
    });

    res.json({ success: true, message: "WA berhasil dikirim ke Operator" });
  } catch (err) {
    console.error("ERROR SEND WA OPERATOR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ KIRIM WA KE ADMIN
app.post("/api/approval/room/admin/send", async (req, res) => {
  try {
    const { bookingId } = req.body;
    const bookingRef = db.collection("room_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();

    // Cari user dengan role admin
    const adminSnap = await db.collection("users").where("role", "==", "admin").limit(1).get();

    if (adminSnap.empty) throw new Error("Admin tidak ditemukan");

    const admin = adminSnap.docs[0].data();
    const phoneNumber = String(admin.noTelp || "").trim();

    if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
      throw new Error("Admin tidak memiliki nomor telepon yang valid");
    }

    // Update admin info di booking
    await bookingRef.update({
      "approval.admin.uid": adminSnap.docs[0].id,
      "approval.admin.nama": admin.nama || "-",
      "approval.admin.email": admin.email || "-",
      "approval.admin.status": "PENDING",
    });

    const token = await createApprovalToken({ bookingId });
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
    const link = `${FRONTEND_URL}/approval/room?bookingId=${bookingId}&token=${token}&role=admin`;

    await sendWhatsApp({
      phone: phoneNumber,
      message: `*APPROVAL PEMINJAMAN RUANG*
*[TAHAP ADMIN - FINAL]*

Yth. ${admin.nama},

Operator telah menyetujui peminjaman ini. Mohon approval final.

📋 *Detail Peminjaman*
- Kegiatan: ${booking.namaKegiatan}
- Divisi: ${booking.peminjam.divisi}
- Peserta: ${booking.peserta}

📅 *Jadwal*
- ${booking.waktuMulai.toDate().toLocaleString("id-ID")} 
- s/d ${booking.waktuSelesai.toDate().toLocaleString("id-ID")}

👉 *Final Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
    });

    res.json({ success: true, message: "WA berhasil dikirim ke Admin" });
  } catch (err) {
    console.error("ERROR SEND WA ADMIN:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
