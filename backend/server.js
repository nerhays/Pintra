const express = require("express");
const cors = require("cors");

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

/**
 * ✅ TEST ROUTE
 */
app.get("/", (req, res) => {
  res.json({ message: "Backend Pintra jalan ✅" });
});

/**
 * ✅ CREATE USER (Auth + Firestore)
 * POST /admin/users/create
 */
app.post("/admin/users/create", async (req, res) => {
  try {
    const { nama, email, password, nipp, divisi, role, noTelp } = req.body;

    if (!nama || !email || !password || !nipp || !role) {
      return res.status(400).json({
        message: "Field wajib: nama, email, password, nipp, role",
      });
    }

    // 1) buat user Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nama,
    });

    const uid = userRecord.uid;

    // 2) simpan user profile ke Firestore
    await db
      .collection("users")
      .doc(uid)
      .set({
        nama,
        email,
        nipp,
        divisi: divisi || "-",
        role,
        noTelp: noTelp || "-",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return res.status(201).json({
      message: "User berhasil dibuat ✅",
      uid,
    });
  } catch (err) {
    console.error("❌ ERROR CREATE USER:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
});

/**
 * ✅ DELETE USER (Auth + Firestore)
 * DELETE /admin/users/:uid
 */
app.delete("/admin/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    // 1) hapus dari Auth
    await admin.auth().deleteUser(uid);

    // 2) hapus dari Firestore
    await db.collection("users").doc(uid).delete();

    return res.json({
      message: "User berhasil dihapus ✅",
      uid,
    });
  } catch (err) {
    console.error("❌ ERROR DELETE USER:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`✅ Backend running di http://localhost:${PORT}`);
});
