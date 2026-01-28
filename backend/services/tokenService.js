const admin = require("firebase-admin");
const crypto = require("crypto");

const db = admin.firestore();

// buat token approval
async function createApprovalToken({ bookingId, expiresInHours = 24 }) {
  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + expiresInHours * 60 * 60 * 1000));

  await db.collection("approval_tokens").add({
    bookingId,
    token,
    used: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  });

  return token;
}

// validasi token
async function verifyApprovalToken({ bookingId, token }) {
  const snap = await db.collection("approval_tokens").where("bookingId", "==", bookingId).where("token", "==", token).limit(1).get();

  if (snap.empty) throw new Error("Token tidak valid");

  const doc = snap.docs[0];
  const data = doc.data();

  if (data.used) throw new Error("Token sudah digunakan");
  if (data.expiresAt.toDate() < new Date()) throw new Error("Token expired");

  return { tokenDocId: doc.id };
}

async function markTokenUsed(tokenDocId) {
  await db.collection("approval_tokens").doc(tokenDocId).update({
    used: true,
  });
}

module.exports = {
  createApprovalToken,
  verifyApprovalToken,
  markTokenUsed,
};
