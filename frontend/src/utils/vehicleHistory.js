import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function addVehicleHistory(bookingId, payload) {
  const ref = collection(db, "vehicle_bookings", bookingId, "approval_history");

  await addDoc(ref, {
    action: payload.action || "-",
    actionBy: payload.actionBy || "-",
    actionRole: payload.actionRole || "-",
    actionJabatan: payload.actionJabatan || "-",

    oldStatus: payload.oldStatus || "-",
    newStatus: payload.newStatus || "-",

    note: payload.note || "-",
    userId: payload.userId || "-",

    timestamp: payload.timestamp || Timestamp.now(),
  });
}
