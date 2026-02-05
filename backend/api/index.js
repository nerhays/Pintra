const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
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
- ${formatWIB(booking.waktuMulai)} 
- s/d ${formatWIB(booking.waktuSelesai)}

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

    // ✅ KIRIM TIMESTAMP LANGSUNG (dalam seconds dan nanoseconds)
    res.json({
      namaKegiatan: booking.namaKegiatan,
      peminjam: booking.peminjam,
      peserta: booking.peserta,
      waktuMulai: {
        seconds: booking.waktuMulai.seconds,
        nanoseconds: booking.waktuMulai.nanoseconds || 0,
      },
      waktuSelesai: {
        seconds: booking.waktuSelesai.seconds,
        nanoseconds: booking.waktuSelesai.nanoseconds || 0,
      },
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
- ${formatWIB(booking.waktuMulai)} 
- s/d ${formatWIB(booking.waktuSelesai)}

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
- ${formatWIB(booking.waktuMulai)} 
- s/d ${formatWIB(booking.waktuSelesai)}

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
- ${formatWIB(booking.waktuMulai)} 
- s/d ${formatWIB(booking.waktuSelesai)}

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
- ${formatWIB(booking.waktuMulai)} 
- s/d ${formatWIB(booking.waktuSelesai)}

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

// ========================================
// VEHICLE APPROVAL ENDPOINTS
// ========================================

// ✅ KIRIM WA KE MANAGER (VEHICLE)
app.post("/api/approval/vehicle/manager/send", async (req, res) => {
  try {
    const { bookingId } = req.body;
    const bookingRef = db.collection("vehicle_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();

    // Cari manager divisi
    const managerSnap = await db.collection("users").where("divisi", "==", booking.divisi).where("jabatan", "==", "manager").limit(1).get();

    if (managerSnap.empty) throw new Error("Manager divisi tidak ditemukan");

    const manager = managerSnap.docs[0].data();
    const phoneNumber = String(manager.noTelp || "").trim();

    if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
      throw new Error("Manager tidak memiliki nomor telepon yang valid");
    }

    const token = await createApprovalToken({ bookingId });
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
    const link = `${FRONTEND_URL}/approval/vehicle?bookingId=${bookingId}&token=${token}&type=manager`;

    await sendWhatsApp({
      phone: phoneNumber,
      message: `*APPROVAL PEMINJAMAN KENDARAAN*

Yth. ${manager.nama},

📋 *Detail Peminjaman*
- Kendaraan: ${booking.vehicle?.nama || "-"} (${booking.vehicle?.platNomor || "-"})
- Peminjam: ${booking.namaPeminjam} (${booking.divisi})
- Keperluan: ${booking.keperluan}
- Tujuan: ${booking.tujuan}
${booking.nomorSurat !== "-" ? `• Nomor Surat: ${booking.nomorSurat}` : ""}

📅 *Jadwal*
- ${formatWIB(booking.waktuPinjam)} 
- s/d ${formatWIB(booking.waktuKembali)}

👉 *Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
    });

    res.json({ success: true, message: "WA berhasil dikirim ke Manager" });
  } catch (err) {
    console.error("ERROR SEND WA MANAGER (VEHICLE):", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ KIRIM WA KE OPERATOR (VEHICLE)
app.post("/api/approval/vehicle/operator/send", async (req, res) => {
  try {
    const { bookingId } = req.body;
    const bookingRef = db.collection("vehicle_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();

    // Cari operator
    const operatorSnap = await db.collection("users").where("role", "==", "operator").limit(1).get();

    if (operatorSnap.empty) throw new Error("Operator tidak ditemukan");

    const operator = operatorSnap.docs[0].data();
    const phoneNumber = String(operator.noTelp || "").trim();

    if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
      throw new Error("Operator tidak memiliki nomor telepon yang valid");
    }

    const token = await createApprovalToken({ bookingId });
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
    const link = `${FRONTEND_URL}/approval/vehicle?bookingId=${bookingId}&token=${token}&type=operator`;

    await sendWhatsApp({
      phone: phoneNumber,
      message: `*APPROVAL PEMINJAMAN KENDARAAN*
*[TAHAP OPERATOR]*

Yth. ${operator.nama},

Manager telah menyetujui peminjaman ini.

📋 *Detail Peminjaman*
- Kendaraan: ${booking.vehicle?.nama || "-"} (${booking.vehicle?.platNomor || "-"})
- Peminjam: ${booking.namaPeminjam} (${booking.divisi})
- Keperluan: ${booking.keperluan}
- Tujuan: ${booking.tujuan}

📅 *Jadwal*
- ${formatWIB(booking.waktuPinjam)} 
- s/d ${formatWIB(booking.waktuKembali)}

👉 *Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
    });

    res.json({ success: true, message: "WA berhasil dikirim ke Operator" });
  } catch (err) {
    console.error("ERROR SEND WA OPERATOR (VEHICLE):", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ KIRIM WA KE ADMIN (VEHICLE)
app.post("/api/approval/vehicle/admin/send", async (req, res) => {
  try {
    const { bookingId } = req.body;
    const bookingRef = db.collection("vehicle_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();

    // Cari admin
    const adminSnap = await db.collection("users").where("role", "==", "admin").limit(1).get();

    if (adminSnap.empty) throw new Error("Admin tidak ditemukan");

    const adminUser = adminSnap.docs[0].data();
    const phoneNumber = String(adminUser.noTelp || "").trim();

    if (!phoneNumber || phoneNumber === "-" || phoneNumber === "0") {
      throw new Error("Admin tidak memiliki nomor telepon yang valid");
    }

    const token = await createApprovalToken({ bookingId });
    const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
    const link = `${FRONTEND_URL}/approval/vehicle?bookingId=${bookingId}&token=${token}&type=admin`;

    await sendWhatsApp({
      phone: phoneNumber,
      message: `*APPROVAL PEMINJAMAN KENDARAAN*
*[TAHAP ADMIN - FINAL]*

Yth. ${adminUser.nama},

Operator telah menyetujui peminjaman ini. Mohon approval final.

📋 *Detail Peminjaman*
- Kendaraan: ${booking.vehicle?.nama || "-"} (${booking.vehicle?.platNomor || "-"})
- Peminjam: ${booking.namaPeminjam} (${booking.divisi})
- Keperluan: ${booking.keperluan}
- Tujuan: ${booking.tujuan}

📅 *Jadwal*
- ${formatWIB(booking.waktuPinjam)} 
- s/d ${formatWIB(booking.waktuKembali)}

👉 *Final Approve / Reject:*
${link}

⏰ Berlaku 24 jam

_Pesan otomatis PINTRA_`,
    });

    res.json({ success: true, message: "WA berhasil dikirim ke Admin" });
  } catch (err) {
    console.error("ERROR SEND WA ADMIN (VEHICLE):", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ VERIFY TOKEN (VEHICLE)
app.get("/api/approval/vehicle/verify", async (req, res) => {
  try {
    const { bookingId, token } = req.query;
    if (!bookingId || !token) throw new Error("Parameter tidak lengkap");

    await verifyApprovalToken({ bookingId, token });
    const bookingRef = db.collection("vehicle_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();

    res.json({
      namaPeminjam: booking.namaPeminjam,
      emailPeminjam: booking.emailPeminjam,
      divisi: booking.divisi,
      keperluan: booking.keperluan,
      tujuan: booking.tujuan,
      nomorSurat: booking.nomorSurat,
      alasan: booking.alasan,
      vehicle: booking.vehicle,
      waktuPinjam: {
        seconds: booking.waktuPinjam.seconds,
        nanoseconds: booking.waktuPinjam.nanoseconds || 0,
      },
      waktuKembali: {
        seconds: booking.waktuKembali.seconds,
        nanoseconds: booking.waktuKembali.nanoseconds || 0,
      },
      status: booking.status,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ ACTION APPROVE/REJECT (VEHICLE) - WITH AUTO TRIGGER
app.post("/api/approval/vehicle/action", async (req, res) => {
  try {
    const { bookingId, token, action, rejectNote } = req.body;
    if (!bookingId || !token || !action) throw new Error("Parameter tidak lengkap");
    if (!["APPROVE", "REJECT"].includes(action)) throw new Error("Action tidak valid");

    const { tokenDocId } = await verifyApprovalToken({ bookingId, token });
    const bookingRef = db.collection("vehicle_bookings").doc(bookingId);
    const snap = await bookingRef.get();

    if (!snap.exists) throw new Error("Booking tidak ditemukan");

    const booking = snap.data();
    const now = admin.firestore.Timestamp.now();
    const currentStatus = booking.status;

    if (action === "REJECT") {
      await bookingRef.update({
        status: "REJECTED",
        rejectedBy: "APPROVAL_SYSTEM",
        rejectionReason: rejectNote || "Ditolak melalui link approval",
        updatedAt: now,
      });

      await markTokenUsed(tokenDocId);
      return res.json({ success: true, message: "Booking REJECTED" });
    }

    // APPROVE LOGIC
    if (currentStatus === "SUBMITTED") {
      // Manager approve → trigger Operator
      await bookingRef.update({
        status: "APPROVAL_1",
        updatedAt: now,
        lastApprovalBy: "Manager (via WA)",
        lastApprovalRole: "manager",
      });

      // Auto trigger Operator
      try {
        console.log("🔄 Triggering Operator approval (vehicle)...");

        const operatorSnap = await db.collection("users").where("role", "==", "operator").limit(1).get();

        if (operatorSnap.empty) {
          console.error("❌ Operator tidak ditemukan");
          await markTokenUsed(tokenDocId);
          return res.json({
            success: true,
            message: "Manager approved, tapi Operator tidak ditemukan",
          });
        }

        const operator = operatorSnap.docs[0].data();
        const phoneNumber = String(operator.noTelp || "").trim();

        if (!phoneNumber || phoneNumber === "-") {
          await markTokenUsed(tokenDocId);
          return res.json({
            success: true,
            message: "Manager approved, tapi Operator tidak punya nomor telepon",
          });
        }

        const operatorToken = await createApprovalToken({ bookingId });
        const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
        const link = `${FRONTEND_URL}/approval/vehicle?bookingId=${bookingId}&token=${operatorToken}&type=operator`;

        await sendWhatsApp({
          phone: phoneNumber,
          message: `*APPROVAL PEMINJAMAN KENDARAAN*
*[TAHAP OPERATOR]*

Yth. ${operator.nama},

Manager telah menyetujui peminjaman ini.

📋 *Detail*
- Kendaraan: ${booking.vehicle?.nama} (${booking.vehicle?.platNomor})
- Peminjam: ${booking.namaPeminjam} (${booking.divisi})
- Tujuan: ${booking.tujuan}

👉 *Approve / Reject:*
${link}

_Pesan otomatis PINTRA_`,
        });

        console.log("✅ WA sent to Operator");
      } catch (err) {
        console.error("❌ Error sending to Operator:", err);
      }
    } else if (currentStatus === "APPROVAL_1") {
      // Operator approve → trigger Admin
      await bookingRef.update({
        status: "APPROVAL_2",
        updatedAt: now,
        lastApprovalBy: "Operator (via WA)",
        lastApprovalRole: "operator",
      });

      // Auto trigger Admin
      try {
        console.log("🔄 Triggering Admin approval (vehicle)...");

        const adminSnap = await db.collection("users").where("role", "==", "admin").limit(1).get();

        if (adminSnap.empty) {
          await markTokenUsed(tokenDocId);
          return res.json({
            success: true,
            message: "Operator approved, tapi Admin tidak ditemukan",
          });
        }

        const adminUser = adminSnap.docs[0].data();
        const phoneNumber = String(adminUser.noTelp || "").trim();

        if (!phoneNumber || phoneNumber === "-") {
          await markTokenUsed(tokenDocId);
          return res.json({
            success: true,
            message: "Operator approved, tapi Admin tidak punya nomor telepon",
          });
        }

        const adminToken = await createApprovalToken({ bookingId });
        const FRONTEND_URL = process.env.FRONTEND_URL || "https://pintra-pelindo.web.app";
        const link = `${FRONTEND_URL}/approval/vehicle?bookingId=${bookingId}&token=${adminToken}&type=admin`;

        await sendWhatsApp({
          phone: phoneNumber,
          message: `*APPROVAL PEMINJAMAN KENDARAAN*
*[TAHAP ADMIN - FINAL]*

Yth. ${adminUser.nama},

Operator telah menyetujui. Mohon approval final.

📋 *Detail*
- Kendaraan: ${booking.vehicle?.nama} (${booking.vehicle?.platNomor})
- Peminjam: ${booking.namaPeminjam}
- Tujuan: ${booking.tujuan}

👉 *Final Approve:*
${link}

_Pesan otomatis PINTRA_`,
        });

        console.log("✅ WA sent to Admin");
      } catch (err) {
        console.error("❌ Error sending to Admin:", err);
      }
    } else if (currentStatus === "APPROVAL_2") {
      // Admin approve → FINAL APPROVED
      await bookingRef.update({
        status: "APPROVAL_3",
        updatedAt: now,
        lastApprovalBy: "Admin (via WA)",
        lastApprovalRole: "admin",
      });
    }

    await markTokenUsed(tokenDocId);
    res.json({ success: true, message: `Booking ${action}D - Next level triggered` });
  } catch (err) {
    console.error("❌ ERROR ACTION (VEHICLE):", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = app;
