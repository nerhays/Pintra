import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import "./RoomDisplay.css";
import pelindoLogo from "../../assets/pelindo-logo.png";

export default function RoomDisplay() {
  const [now, setNow] = useState(new Date());
  const [activeRoom, setActiveRoom] = useState(null);

  /* ================= JAM REALTIME ================= */
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /* ================= FIRESTORE LISTENER ================= */
  useEffect(() => {
    const ref = collection(db, "booking_ruang");

    // ✅ QUERY AMAN (TIDAK NESTED MAP)
    const q = query(ref, where("approvalAdminStatus", "==", "APPROVED"), where("ruang.status", "==", "APPROVED"));

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (!data.length) {
        setActiveRoom(null);
        return;
      }

      const nowMillis = Date.now();

      // ✅ RANGE HARI INI (ANTI TIMEZONE ERROR)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // 1️⃣ JADWAL HARI INI
      const todaySchedules = data.filter((item) => {
        if (!item.waktuMulai || !item.waktuSelesai) return false;
        const start = item.waktuMulai.toDate();
        return start >= startOfDay && start <= endOfDay;
      });

      // 2️⃣ SEDANG BERLANGSUNG
      const ongoing = todaySchedules.find((item) => {
        const start = item.waktuMulai.toMillis();
        const end = item.waktuSelesai.toMillis();
        return nowMillis >= start && nowMillis <= end;
      });

      if (ongoing) {
        setActiveRoom({
          ...ongoing,
          displayStatus: "ONGOING",
        });
        return;
      }

      // 3️⃣ AKAN DATANG (TERDEKAT)
      const upcoming = todaySchedules.filter((item) => item.waktuMulai.toMillis() > nowMillis).sort((a, b) => a.waktuMulai.toMillis() - b.waktuMulai.toMillis())[0];

      if (upcoming) {
        setActiveRoom({
          ...upcoming,
          displayStatus: "UPCOMING",
        });
      } else {
        setActiveRoom(null);
      }
    });

    return () => unsub();
  }, []);

  /* ================= FORMAT ================= */
  const formatTime = (date) =>
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const formatDate = (date) =>
    date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  /* ================= RENDER ================= */
  return (
    <div className="display-page">
      {/* HEADER */}
      <header className="display-header">
        <img src={pelindoLogo} alt="Pelindo" className="logo" />
      </header>

      {/* CONTENT */}
      <div className="display-content">
        {/* LEFT */}
        <div className="left-section">
          <h1>Jadwal Ruang Rapat</h1>

          {activeRoom ? (
            <>
              <div className="current-schedule">
                <span className="time-range">
                  {activeRoom.waktuMulai.toDate().toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {activeRoom.waktuSelesai.toDate().toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                <span className={`badge ${activeRoom.displayStatus === "ONGOING" ? "red" : "blue"}`}>{activeRoom.displayStatus === "ONGOING" ? "Sedang Berlangsung" : "Akan Datang"}</span>
              </div>

              <p className="room-name">Ruang {activeRoom.ruang?.roomId}</p>
              <p className="meeting-name">{activeRoom.namaKegiatan}</p>
            </>
          ) : (
            <>
              <div className="current-schedule">
                <span className="badge green">Ruang Tersedia</span>
              </div>
              <p className="room-name">Tidak ada jadwal</p>
              <p className="meeting-name">-</p>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="right-section">
          <div className="clock">
            <div className="clock-text">{formatTime(now)}</div>
            <div className="clock-label">{formatDate(now)}</div>
          </div>

          <div className="schedule-card">
            {activeRoom ? (
              <div className="schedule-item active">
                <div>
                  <h4>{activeRoom.ruang?.roomId}</h4>
                  <p>{activeRoom.namaKegiatan}</p>
                </div>
                <div className="schedule-right">
                  <span className="time">
                    {activeRoom.waktuMulai.toDate().toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {activeRoom.waktuSelesai.toDate().toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="schedule-item available">
                <div>
                  <h4>-</h4>
                  <p>Tidak ada jadwal</p>
                </div>
                <div className="schedule-right">
                  <span className="badge green">Tersedia</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="display-footer">
        <div className="marquee">
          <span>
            Melalui <b>PINTRA</b>, Pelindo mengintegrasikan kinerja, sistem, dan layanan digital secara real-time untuk mendukung operasional yang andal, transparan, dan terpercaya.
          </span>
        </div>
      </footer>
    </div>
  );
}
