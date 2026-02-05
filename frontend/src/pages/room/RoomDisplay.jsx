import { useEffect, useState, useRef } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import "./RoomDisplay.css";
import pelindoLogo from "../../assets/pelindo-logo.png";

export default function RoomDisplay() {
  const [now, setNow] = useState(new Date());
  const [activeRoom, setActiveRoom] = useState(null);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [roomMap, setRoomMap] = useState({});

  // 🔁 ROTASI ONGOING
  const [ongoingRooms, setOngoingRooms] = useState([]);
  const [ongoingIndex, setOngoingIndex] = useState(0);

  // 🔁 AUTO-SCROLL LIST
  const scrollContainerRef = useRef(null);

  /* ================= JAM REALTIME ================= */
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ================= LOAD MASTER RUANG ================= */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snapshot) => {
      const map = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        map[doc.id] = {
          namaRuang: data.namaRuang,
          lokasi: data.lokasi,
        };
      });
      setRoomMap(map);
    });

    return () => unsub();
  }, []);

  /* ================= BOOKING ================= */
  useEffect(() => {
    const q = query(collection(db, "room_bookings"));

    const unsub = onSnapshot(q, (snapshot) => {
      const nowMillis = Date.now();

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))

        /* ✅ APPROVAL HARUS APPROVED */
        .filter((item) => {
          const a = item.approval || {};
          return a.admin?.status === "APPROVED" && a.manager?.status === "APPROVED" && a.operator?.status === "APPROVED";
        })

        /* ✅ HARI INI & BELUM SELESAI */
        .filter((item) => {
          if (!item.waktuMulai || !item.waktuSelesai) return false;

          const start = item.waktuMulai.toDate();
          const end = item.waktuSelesai.toDate();

          return start >= startOfDay && start <= endOfDay && end.getTime() > nowMillis;
        })

        .sort((a, b) => a.waktuMulai.toMillis() - b.waktuMulai.toMillis());

      setTodaySchedules(data);

      /* ================= ONGOING ================= */
      const ongoingList = data.filter((item) => {
        const start = item.waktuMulai.toMillis();
        const end = item.waktuSelesai.toMillis();
        return nowMillis >= start && nowMillis <= end;
      });

      setOngoingRooms(ongoingList);

      if (ongoingList.length > 0) {
        const current = ongoingList[ongoingIndex % ongoingList.length];
        setActiveRoom({ ...current, displayStatus: "ONGOING" });
        return;
      }

      /* ================= UPCOMING ================= */
      const upcoming = data.find((item) => item.waktuMulai.toMillis() > nowMillis);

      setActiveRoom(upcoming ? { ...upcoming, displayStatus: "UPCOMING" } : null);
    });

    return () => unsub();
  }, [ongoingIndex]);

  /* ================= ROTASI ONGOING ================= */
  useEffect(() => {
    if (ongoingRooms.length <= 1) return;

    const interval = setInterval(() => {
      setOngoingIndex((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [ongoingRooms]);

  /* ================= RESET INDEX ================= */
  useEffect(() => {
    setOngoingIndex(0);
  }, [ongoingRooms.length]);

  /* ================= AUTO-SCROLL LIST ================= */
  useEffect(() => {
    if (!scrollContainerRef.current || todaySchedules.length <= 2) return;

    const container = scrollContainerRef.current;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    if (scrollHeight <= clientHeight) return;

    let scrollPosition = 0;
    const scrollStep = 1;
    const scrollInterval = 50; // ms per step
    const pauseAtTop = 3000; // pause 3 detik di atas
    const pauseAtBottom = 3000; // pause 3 detik di bawah

    let isPaused = true;
    let pauseTimer = null;

    const autoScroll = () => {
      if (isPaused) return;

      scrollPosition += scrollStep;

      if (scrollPosition >= scrollHeight - clientHeight) {
        // Sampai bawah, pause lalu reset
        container.scrollTop = scrollHeight - clientHeight;
        isPaused = true;
        pauseTimer = setTimeout(() => {
          scrollPosition = 0;
          container.scrollTop = 0;
          pauseTimer = setTimeout(() => {
            isPaused = false;
          }, pauseAtTop);
        }, pauseAtBottom);
      } else {
        container.scrollTop = scrollPosition;
      }
    };

    // Start dengan pause di atas
    pauseTimer = setTimeout(() => {
      isPaused = false;
    }, pauseAtTop);

    const interval = setInterval(autoScroll, scrollInterval);

    return () => {
      clearInterval(interval);
      if (pauseTimer) clearTimeout(pauseTimer);
    };
  }, [todaySchedules]);

  /* ================= FORMAT ================= */
  const formatTime = (date) =>
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const formatDate = (date) =>
    date
      .toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      .toUpperCase();

  /* ================= ROOM NAME + LOKASI ================= */
  const getRoomName = (roomId) => {
    const room = roomMap[roomId];
    if (!room) return "RUANG TIDAK DIKETAHUI";

    return `${room.namaRuang} – ${room.lokasi}`.toUpperCase();
  };

  /* ================= RENDER ================= */
  return (
    <div className="display-page">
      <header className="display-header">
        <img src={pelindoLogo} alt="Pelindo" className="logo" />
      </header>

      <div className="display-content">
        {/* LEFT */}
        <div className="left-section">
          <h1>JADWAL RUANG RAPAT</h1>

          {activeRoom ? (
            <>
              <div className="current-schedule">
                <span className="time-range">
                  {activeRoom.waktuMulai.toDate().toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {activeRoom.waktuSelesai.toDate().toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                <span className={`badge ${activeRoom.displayStatus === "ONGOING" ? "red" : "blue"}`}>{activeRoom.displayStatus === "ONGOING" ? "SEDANG BERLANGSUNG" : "AKAN DATANG"}</span>
              </div>

              <p className="room-name">{getRoomName(activeRoom.ruang?.roomId)}</p>
              <p className="meeting-name">{activeRoom.namaKegiatan?.toUpperCase()}</p>
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
            <div className="schedule-list-container" ref={scrollContainerRef}>
              {todaySchedules.map((item) => {
                const nowMillis = Date.now();
                const isActive = nowMillis >= item.waktuMulai.toMillis() && nowMillis <= item.waktuSelesai.toMillis();

                return (
                  <div key={item.id} className={`schedule-item ${isActive ? "active" : ""}`}>
                    <div>
                      <h4>{getRoomName(item.ruang?.roomId)}</h4>
                      <p>{item.namaKegiatan?.toUpperCase()}</p>
                    </div>
                    <div className="schedule-right">
                      <span className="time">
                        {item.waktuMulai.toDate().toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" - "}
                        {item.waktuSelesai.toDate().toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <footer className="display-footer">
        <div className="marquee">
          <span>
            <b>MELALUI PINTRA, PELINDO MENGINTEGRASIKAN KINERJA, SISTEM, DAN LAYANAN DIGITAL SECARA REALTIME.</b>
          </span>
        </div>
      </footer>
    </div>
  );
}
