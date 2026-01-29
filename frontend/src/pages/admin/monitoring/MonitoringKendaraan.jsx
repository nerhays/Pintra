import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import AdminLayout from "../../../components/admin/AdminLayout";
import "./Monitoring.css";
import { exportVehicleToPDF, exportVehicleToExcel } from "../../../utils/exportHelper";

/* ================== HELPER ================== */
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

const getStatusBadge = (status) => {
  const statusMap = {
    APPROVAL_1: { label: "Waiting Manager", class: "waiting" },
    APPROVAL_2: { label: "Waiting Operator", class: "waiting" },
    APPROVAL_3: { label: "Waiting Admin", class: "waiting" },
    APPROVED: { label: "Approved", class: "approved" },
    ON_GOING: { label: "On Going", class: "on_going" },
    DONE: { label: "Done", class: "approved" },
    REJECTED: { label: "Rejected", class: "rejected" },
    CANCELLED: { label: "Cancelled", class: "rejected" },
  };

  return statusMap[status] || { label: status, class: "waiting" };
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};

/* ================== COMPONENT ================== */
function MonitoringKendaraan() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortColumn, setSortColumn] = useState("waktuPinjam");
  const [sortDirection, setSortDirection] = useState("desc");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ✅ Cache untuk nama kendaraan
  const [vehicleNames, setVehicleNames] = useState({});

  // ✅ FETCH NAMA KENDARAAN DARI COLLECTION VEHICLES
  useEffect(() => {
    const fetchVehicleNames = async () => {
      try {
        const vehiclesSnap = await getDocs(collection(db, "vehicles"));
        const names = {};

        vehiclesSnap.docs.forEach((doc) => {
          const data = doc.data();
          names[doc.id] = {
            nama: data.nama || "-",
            platNomor: data.platNomor || "-",
            jenis: data.jenis || "-",
          };
        });

        setVehicleNames(names);
        console.log("✅ Vehicle names loaded:", names);
      } catch (err) {
        console.error("❌ Error loading vehicle names:", err);
      }
    };

    fetchVehicleNames();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "vehicle_bookings"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          const vehicleId = d.vehicle?.vehicleId || "-";
          const vehicleInfo = vehicleNames[vehicleId] || {};

          return {
            id: doc.id,
            namaPeminjam: d.namaPeminjam || "-",
            divisi: d.divisi || "-",
            keperluan: d.keperluan || "-",
            tujuan: d.tujuan || "-",
            nomorSurat: d.nomorSurat || "-",

            vehicleId: vehicleId,
            vehicleNama: vehicleInfo.nama || d.vehicle?.nama || "-",
            vehiclePlat: vehicleInfo.platNomor || d.vehicle?.platNomor || "-",
            vehicleJenis: vehicleInfo.jenis || d.vehicle?.jenis || "-",

            status: d.status || "-",
            statusBadge: getStatusBadge(d.status),

            waktuPinjam: d.waktuPinjam || null,
            waktuKembali: d.waktuKembali || null,
            waktuPinjamStr: formatDate(d.waktuPinjam),
            waktuKembaliStr: formatDate(d.waktuKembali),

            // ✅ Lokasi tracking (bisa ditambahkan nanti)
            currentLocation: d.currentLocation || null,
          };
        });

        setVehicles(data);
        setLoading(false);
      },
      (error) => {
        console.error("🔥 FIRESTORE ERROR:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [vehicleNames]);

  /* ================== FILTER (MAX 7 HARI) ================== */
  const filteredVehicles = vehicles.filter((item) => {
    if (!item.waktuPinjam) return false;
    if (!startDate || !endDate) return true;

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const date = item.waktuPinjam.toDate();
    return date >= start && date <= end;
  });

  /* ================== SORT PER KOLOM ================== */
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    let valA, valB;

    switch (sortColumn) {
      case "namaPeminjam":
        valA = a.namaPeminjam.toLowerCase();
        valB = b.namaPeminjam.toLowerCase();
        break;

      case "divisi":
        valA = a.divisi.toLowerCase();
        valB = b.divisi.toLowerCase();
        break;

      case "vehicle":
        valA = a.vehicleNama.toLowerCase();
        valB = b.vehicleNama.toLowerCase();
        break;

      case "tujuan":
        valA = a.tujuan.toLowerCase();
        valB = b.tujuan.toLowerCase();
        break;

      case "status":
        valA = a.status.toLowerCase();
        valB = b.status.toLowerCase();
        break;

      case "waktuPinjam":
      default:
        if (!a.waktuPinjam || !b.waktuPinjam) return 0;
        valA = a.waktuPinjam.toMillis();
        valB = b.waktuPinjam.toMillis();
        break;
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const getSortIcon = (column) => {
    if (sortColumn !== column) return "⇅";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <AdminLayout>
      <div className="monitoring-container">
        <h2 className="monitoring-title">🚗 Monitoring Kendaraan</h2>

        {/* ACTION */}
        <div className="monitoring-action">
          <div className="monitoring-btn-group">
            <button className="monitoring-btn pdf" onClick={() => exportVehicleToPDF(sortedVehicles, "Monitoring Kendaraan")} disabled={sortedVehicles.length === 0}>
              📄 Export PDF
            </button>

            <button className="monitoring-btn excel" onClick={() => exportVehicleToExcel(sortedVehicles, "Monitoring Kendaraan")} disabled={sortedVehicles.length === 0}>
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
                setEndDate("");
              }}
            />

            <span>s/d</span>

            <input type="date" value={endDate} min={startDate} max={startDate ? addDays(startDate, 7) : ""} disabled={!startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* LOADING */}
        {loading && <p className="monitoring-empty">⏳ Memuat data...</p>}

        {/* EMPTY */}
        {!loading && sortedVehicles.length === 0 && <p className="monitoring-empty">{startDate && endDate ? "📭 Tidak ada data untuk rentang tanggal yang dipilih" : "📭 Belum ada data booking kendaraan"}</p>}

        {/* TABLE */}
        {!loading && sortedVehicles.length > 0 && (
          <div className="monitoring-table-wrapper">
            <table className="monitoring-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>No</th>

                  <th className={`sortable ${sortColumn === "namaPeminjam" ? "active" : ""}`} onClick={() => handleSort("namaPeminjam")}>
                    Peminjam <span className="sort-icon">{getSortIcon("namaPeminjam")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "divisi" ? "active" : ""}`} onClick={() => handleSort("divisi")}>
                    Divisi <span className="sort-icon">{getSortIcon("divisi")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "vehicle" ? "active" : ""}`} onClick={() => handleSort("vehicle")}>
                    Kendaraan <span className="sort-icon">{getSortIcon("vehicle")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "tujuan" ? "active" : ""}`} onClick={() => handleSort("tujuan")}>
                    Tujuan <span className="sort-icon">{getSortIcon("tujuan")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "status" ? "active" : ""}`} onClick={() => handleSort("status")} style={{ width: "150px" }}>
                    Status <span className="sort-icon">{getSortIcon("status")}</span>
                  </th>

                  <th className={`sortable ${sortColumn === "waktuPinjam" ? "active" : ""}`} onClick={() => handleSort("waktuPinjam")}>
                    Waktu Pinjam <span className="sort-icon">{getSortIcon("waktuPinjam")}</span>
                  </th>

                  <th>Waktu Kembali</th>

                  <th style={{ width: "100px" }}>Lokasi</th>
                </tr>
              </thead>

              <tbody>
                {sortedVehicles.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>

                    <td>
                      <strong>{item.namaPeminjam}</strong>
                    </td>

                    <td>{item.divisi}</td>

                    <td>
                      <strong>{item.vehicleNama}</strong>
                      <br />
                      <small style={{ color: "#6b7280" }}>
                        {item.vehiclePlat} • {item.vehicleJenis}
                      </small>
                    </td>

                    <td>{item.tujuan}</td>

                    <td>
                      <span className={`status-badge ${item.statusBadge.class}`}>{item.statusBadge.label}</span>
                    </td>

                    <td>{item.waktuPinjamStr}</td>
                    <td>{item.waktuKembaliStr}</td>

                    <td style={{ textAlign: "center" }}>
                      {item.currentLocation ? (
                        <a
                          href={`https://www.google.com/maps?q=${item.currentLocation.lat},${item.currentLocation.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#3b82f6",
                            textDecoration: "none",
                            fontWeight: 600,
                            fontSize: "18px",
                          }}
                          title="Lihat di Google Maps"
                        >
                          📍
                        </a>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      )}
                    </td>
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

export default MonitoringKendaraan;
