import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import "./RoomDisplay.css";
import pelindoLogo from "../../assets/pelindo-logo.png";

export default function RoomDisplay() {
  const [now, setNow] = useState(new Date());
  const [activeRoom, setActiveRoom] = useState(null);

  /* ================= JAM & TANGGAL REALTIME ================= */
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* ================= DATA RUANG (APPROVED ADMIN) ================= */
  useEffect(() => {
    const ref = collection(db, "booking_ruang");

    const q = query(
      ref,
      where("approval.admin.status", "==", "APPROVED")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const current = data.find((item) => {
        if (!item.waktuMulai || !item.waktuSelesai) return false;

        const start = item.waktuMulai.toDate();
        const end = item.waktuSelesai.toDate();

        return now >= start && now <= end;
      });

      setActiveRoom(current || null);
    });

    return () => unsub();
  }, [now]);

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
                  {activeRoom.waktuMulai
                    .toDate()
                    .toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                  -{" "}
                  {activeRoom.waktuSelesai
                    .toDate()
                    .toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </span>
                <span className="badge red">Sedang Berlangsung</span>
              </div>

              <p className="room-name">
                Ruang {activeRoom.ruang?.roomId}
              </p>
              <p className="meeting-name">
                {activeRoom.namaKegiatan}
              </p>
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
          {/* JAM (DESAIN TETAP) */}
          <div className="clock">
            <div className="clock-text">{formatTime(now)}</div>
            <div className="clock-label">{formatDate(now)}</div>
          </div>

          {/* CARD (STATIS / BISA DISAMBUNG NANTI) */}
          <div className="schedule-card">
            {activeRoom ? (
              <div className="schedule-item active">
                <div>
                  <h4>{activeRoom.ruang?.roomId}</h4>
                  <p>{activeRoom.namaKegiatan}</p>
                </div>
                <div className="schedule-right">
                  <span className="time">
                    {activeRoom.waktuMulai
                      .toDate()
                      .toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                    -{" "}
                    {activeRoom.waktuSelesai
                      .toDate()
                      .toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>
                  <span className="badge red">Sedang Berlangsung</span>
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
            Melalui <b>PINTRA</b>, Pelindo mengintegrasikan kinerja, sistem,
            dan layanan digital secara real-time untuk mendukung operasional
            yang andal, transparan, dan terpercaya di seluruh lingkungan kerja.
          </span>
        </div>
      </footer>
    </div>
  );
}
