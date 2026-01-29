import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import AdminLayout from "../../../components/admin/AdminLayout";
import "./Monitoring.css";
import { exportToPDF, exportToExcel } from "../../../utils/exportHelper";

/* ================== HELPER ================== */
const getMonitoringStatus = (approval) => {
  if (!approval) return "WAITING";

  if (approval.manager?.status === "REJECTED" || approval.operator?.status === "REJECTED" || approval.admin?.status === "REJECTED") {
    return "REJECTED";
  }

  if (approval.operator?.status === "ON_GOING") {
    return "ON_GOING";
  }

  if (approval.manager?.status === "APPROVED" && approval.operator?.status === "APPROVED" && approval.admin?.status === "APPROVED") {
    return "APPROVED";
  }

  return "WAITING";
};

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return "-";
  return timestamp.toDate().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};

/* ================== COMPONENT ================== */
function MonitoringRuang() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortColumn, setSortColumn] = useState("waktuMulai");
  const [sortDirection, setSortDirection] = useState("desc");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ✅ Cache untuk nama ruang
  const [roomNames, setRoomNames] = useState({});

  // ✅ FETCH NAMA RUANG DARI COLLECTION ROOMS
  useEffect(() => {
    const fetchRoomNames = async () => {
      try {
        const roomsSnap = await getDocs(collection(db, "rooms"));
        const names = {};

        roomsSnap.docs.forEach((doc) => {
          names[doc.id] = doc.data().namaRuang || "-";
        });

        setRoomNames(names);
        console.log("✅ Room names loaded:", names);
      } catch (err) {
        console.error("❌ Error loading room names:", err);
      }
    };

    fetchRoomNames();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "room_bookings"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          const roomId = d.ruang?.roomId || "-";

          return {
            id: doc.id,
            namaKegiatan: d.namaKegiatan || "-",
            peminjam: d.peminjam?.nama || "-",
            ruangId: roomId,
            ruangNama: roomNames[roomId] || roomId, // ✅ Gunakan nama dari cache
            status: getMonitoringStatus(d.approval),
            waktuMulai: d.waktuMulai || null,
            waktuSelesai: d.waktuSelesai || null,
            waktuMulaiStr: formatDate(d.waktuMulai),
            waktuSelesaiStr: formatDate(d.waktuSelesai),
          };
        });

        setRooms(data);
        setLoading(false);
      },
      (error) => {
        console.error("🔥 FIRESTORE ERROR:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [roomNames]); // ✅ Re-fetch saat roomNames berubah

  /* ================== FILTER (MAX 7 HARI) ================== */
  const filteredRooms = rooms.filter((item) => {
    if (!item.waktuMulai) return false;
    if (!startDate || !endDate) return true;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const date = item.waktuMulai.toDate();
    return date >= start && date <= end;
  });

  /* ================== SORT PER KOLOM ================== */
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default asc
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    let valA, valB;

    switch (sortColumn) {
      case "namaKegiatan":
        valA = a.namaKegiatan.toLowerCase();
        valB = b.namaKegiatan.toLowerCase();
        break;

      case "peminjam":
        valA = a.peminjam.toLowerCase();
        valB = b.peminjam.toLowerCase();
        break;

      case "ruang":
        valA = a.ruangNama.toLowerCase();
        valB = b.ruangNama.toLowerCase();
        break;

      case "status":
        valA = a.status.toLowerCase();
        valB = b.status.toLowerCase();
        break;

      case "waktuMulai":
      default:
        if (!a.waktuMulai || !b.waktuMulai) return 0;
        valA = a.waktuMulai.toMillis();
        valB = b.waktuMulai.toMillis();
        break;
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  /* ================== SORT ICON ================== */
  const getSortIcon = (column) => {
    if (sortColumn !== column) return "⇅";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <AdminLayout>
      <div className="monitoring-container">
        <h2 className="monitoring-title">📊 Monitoring Ruang</h2>

        {/* ACTION */}
        <div className="monitoring-action">
          <div className="monitoring-btn-group">
            <button className="monitoring-btn pdf" onClick={() => exportToPDF(sortedRooms, "Monitoring Ruang", roomNames)} disabled={sortedRooms.length === 0}>
              📄 Export PDF
            </button>

            <button className="monitoring-btn excel" onClick={() => exportToExcel(sortedRooms, "Monitoring Ruang", roomNames)} disabled={sortedRooms.length === 0}>
              📊 Export Excel
            </button>
          </div>

          {/* DATE FILTER */}
          <div className="monitoring-filter-date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setEndDate(""); // reset end date
              }}
            />

            <span>s/d</span>

            <input type="date" value={endDate} min={startDate} max={startDate ? addDays(startDate, 7) : ""} disabled={!startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* LOADING */}
        {loading && <p className="monitoring-empty">⏳ Memuat data...</p>}

        {/* EMPTY */}
        {!loading && sortedRooms.length === 0 && <p className="monitoring-empty">{startDate && endDate ? "📭 Tidak ada data untuk rentang tanggal yang dipilih" : "📭 Belum ada data booking ruang"}</p>}

        {/* TABLE */}
        {!loading && sortedRooms.length > 0 && (
          <div className="monitoring-table-wrapper">
            <table className="monitoring-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>No</th>

                  <th className={`sortable ${sortColumn === "namaKegiatan" ? "active" : ""}`} onClick={() => handleSort("namaKegiatan")}>
                    Nama Kegiatan <span className="sort-icon">{getSortIcon("namaKegiatan")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "peminjam" ? "active" : ""}`} onClick={() => handleSort("peminjam")}>
                    Peminjam <span className="sort-icon">{getSortIcon("peminjam")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "ruang" ? "active" : ""}`} onClick={() => handleSort("ruang")}>
                    Ruang <span className="sort-icon">{getSortIcon("ruang")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "status" ? "active" : ""}`} onClick={() => handleSort("status")} style={{ width: "130px" }}>
                    Status <span className="sort-icon">{getSortIcon("status")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "waktuMulai" ? "active" : ""}`} onClick={() => handleSort("waktuMulai")}>
                    Waktu Mulai <span className="sort-icon">{getSortIcon("waktuMulai")}</span>
                  </th>

                  <th>Waktu Selesai</th>
                </tr>
              </thead>

              <tbody>
                {sortedRooms.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{item.namaKegiatan}</strong>
                    </td>
                    <td>{item.peminjam}</td>
                    <td>{item.ruangNama}</td>
                    <td>
                      <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                    </td>
                    <td>{item.waktuMulaiStr}</td>
                    <td>{item.waktuSelesaiStr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default MonitoringRuang;
