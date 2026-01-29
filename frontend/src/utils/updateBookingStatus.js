import { collection, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export const checkAndUpdateBookingStatuses = async () => {
  console.log("🔄 Starting status update check...");

  // ✅ PAKAI UTC DATE ASLI
  const now = new Date();
  console.log("⏰ Current time (UTC ref):", now.toISOString());

  try {
    const roomSnap = await getDocs(collection(db, "room_bookings"));
    console.log(`📋 Found ${roomSnap.docs.length} room bookings`);

    let roomUpdated = 0;

    for (const docSnap of roomSnap.docs) {
      const data = docSnap.data();
      const currentStatus = data.status;

      const waktuMulai = data.waktuMulai?.toDate();
      const waktuSelesai = data.waktuSelesai?.toDate();

      if (!waktuMulai || !waktuSelesai) continue;

      // 🔎 DEBUG REAL COMPARISON
      console.log(`📅 Room ${docSnap.id}:`, {
        status: currentStatus,
        waktuMulai: waktuMulai.toISOString(),
        waktuSelesai: waktuSelesai.toISOString(),
        now: now.toISOString(),
        shouldBeOnGoing: currentStatus === "APPROVED" && now >= waktuMulai && now < waktuSelesai,
        shouldBeDone: ["ON_GOING", "APPROVED"].includes(currentStatus) && now >= waktuSelesai,
      });

      // APPROVED → ON_GOING
      if (currentStatus === "APPROVED" && now >= waktuMulai && now < waktuSelesai) {
        await updateDoc(doc(db, "room_bookings", docSnap.id), {
          status: "ON_GOING",
          updatedAt: Timestamp.now(),
        });
        roomUpdated++;
      }

      // ON_GOING / APPROVED → DONE
      if (["ON_GOING", "APPROVED"].includes(currentStatus) && now >= waktuSelesai) {
        await updateDoc(doc(db, "room_bookings", docSnap.id), {
          status: "DONE",
          updatedAt: Timestamp.now(),
          completedAt: Timestamp.now(),
        });
        roomUpdated++;
      }
    }

    return { roomUpdated, success: true };
  } catch (err) {
    console.error("❌ Error updating statuses:", err);
    return { success: false, error: err.message };
  }
};
