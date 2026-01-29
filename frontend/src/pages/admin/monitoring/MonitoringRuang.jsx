import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import AdminLayout from "../../../components/admin/AdminLayout";
import "./Monitoring.css";
import { exportToPDF, exportToExcel } from "../../../utils/exportHelper";

/* ================== HELPER ================== */
const getMonitoringStatus = (approval) => {
  if (!approval) return "WAITING";

  if (
    approval.manager?.status === "REJECTED" ||
    approval.admin?.status === "REJECTED"
  ) {
    return "REJECTED";
  }

  if (approval.operator?.status === "ON_GOING") {
    return "ON_GOING";
  }

  if (
    approval.manager?.status === "APPROVED" &&
    approval.admin?.status === "APPROVED"
  ) {
    return "APPROVED";
  }

  return "WAITING";
};

const formatDate = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return "-";
  return timestamp.toDate().toLocaleString("id-ID");
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

  const [sortOrder, setSortOrder] = useState("desc");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "room_bookings"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();

          return {
            id: doc.id,
            namaKegiatan: d.namaKegiatan || "-",
            peminjam: d.peminjam?.nama || "-",
            ruangId: d.ruang?.roomId || "-",
            status: getMonitoringStatus(d.approval),
            waktuMulai: d.waktuMulai || null,
            waktu:
              d.waktuMulai && d.waktuSelesai
                ? `${formatDate(d.waktuMulai)} – ${formatDate(
                    d.waktuSelesai
                  )}`
                : "-",
          };
        });

        setRooms(data);
        setLoading(false);
      },
      (error) => {
        console.error("🔥 FIRESTORE ERROR:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

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

  /* ================== SORT ================== */
  const sortedRooms = [...filteredRooms].sort((a, b) => {
    if (!a.waktuMulai || !b.waktuMulai) return 0;

    const timeA = a.waktuMulai.toMillis();
    const timeB = b.waktuMulai.toMillis();

    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });

  return (
    <AdminLayout>
      <div className="monitoring-container">
        <h2 className="monitoring-title">Monitoring Ruang</h2>

        {/* ACTION */}
        <div className="monitoring-action">
          <button
            className="monitoring-btn pdf"
            onClick={() => exportToPDF(sortedRooms, "Monitoring Ruang")}
          >
            📄 Export PDF
          </button>

          <button
            className="monitoring-btn excel"
            onClick={() => exportToExcel(sortedRooms, "Monitoring Ruang")}
          >
            📊 Export Excel
          </button>

          <button
            className="monitoring-btn sort"
            onClick={() =>
              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
            }
          >
            🗓️ {sortOrder === "asc" ? "⬆ Lama → Baru" : "⬇ Baru → Lama"}
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

          <input
            type="date"
            value={endDate}
            min={startDate}
            max={startDate ? addDays(startDate, 7) : ""}
            disabled={!startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* LOADING */}
        {loading && <p className="monitoring-empty">Memuat data...</p>}

        {/* EMPTY */}
        {!loading && sortedRooms.length === 0 && (
          <p className="monitoring-empty">Tidak ada data</p>
        )}

        {/* TABLE */}
        {!loading && sortedRooms.length > 0 && (
          <div className="monitoring-table-wrapper">
            <table className="monitoring-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Kegiatan</th>
                  <th>Peminjam</th>
                  <th>Ruang</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
              </thead>

              <tbody>
                {sortedRooms.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.namaKegiatan}</td>
                    <td>{item.peminjam}</td>
                    <td>{item.ruangId}</td>
                    <td>
                      <span
                        className={`status-badge ${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{item.waktu}</td>
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
