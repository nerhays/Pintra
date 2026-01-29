import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import AdminLayout from "../../../components/admin/AdminLayout";
import "./Monitoring.css";
import { exportToPDF, exportToExcel } from "../../../utils/exportHelper";

function MonitoringKendaraan() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "vehicle_bookings"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setVehicles(data);
        setLoading(false);
      },
      (error) => {
        console.error("🔥 FIRESTORE ERROR:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "-";
    return timestamp.toDate().toLocaleString("id-ID");
  };

  const getStatusLabel = (status) => {
    if (status === "APPROVED") return "Approved";
    if (status === "ON_GOING") return "On Going";
    if (status === "DONE") return "Done";
    return "-";
  };

  return (
    <AdminLayout>
      <div className="monitoring-container">
        <h2 className="monitoring-title">Monitoring Kendaraan</h2>

        {/* ACTION */}
        <div className="monitoring-action">
          <button
            className="monitoring-btn pdf"
            onClick={() =>
              exportToPDF(vehicles, "Monitoring Kendaraan")
            }
          >
            📄 Export PDF
          </button>

          <button
            className="monitoring-btn excel"
            onClick={() =>
              exportToExcel(vehicles, "Monitoring Kendaraan")
            }
          >
            📊 Export Excel
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <p className="monitoring-empty">
            Memuat data...
          </p>
        )}

        {/* EMPTY */}
        {!loading && vehicles.length === 0 && (
          <p className="monitoring-empty">
            Tidak ada data kendaraan
          </p>
        )}

        {/* TABLE */}
        {!loading && vehicles.length > 0 && (
          <div className="monitoring-table-wrapper">
            <table className="monitoring-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Kegiatan</th>
                  <th>Peminjam</th>
                  <th>Kendaraan</th>
                  <th>Waktu</th>
                  <th>Status</th>
                  <th>Lokasi</th>
                </tr>
              </thead>

              <tbody>
                {vehicles.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>

                    <td>{item.namaKegiatan || "-"}</td>

                    <td>{item.peminjam?.nama || "-"}</td>

                    <td>
                      {item.kendaraan?.jenis || "-"} <br />
                      <small>
                        {item.kendaraan?.platNomor || "-"}
                      </small>
                    </td>

                    <td>
                      {formatDate(item.waktuMulai)} <br />–
                      <br />
                      {formatDate(item.waktuSelesai)}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          item.kendaraan?.status?.toLowerCase() ||
                          ""
                        }`}
                      >
                        {getStatusLabel(
                          item.kendaraan?.status
                        )}
                      </span>
                    </td>

                    <td>
                      {item.lokasi?.alamat || "-"}
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
