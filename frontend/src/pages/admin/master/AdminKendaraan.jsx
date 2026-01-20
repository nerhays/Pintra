import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import "./AdminKendaraan.css";

function AdminKendaraan() {
  const [kendaraan, setKendaraan] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKendaraan = async () => {
      try {
        const snapshot = await getDocs(collection(db, "kendaraan"));

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setKendaraan(data);
      } catch (error) {
        console.error("Gagal mengambil data kendaraan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchKendaraan();
  }, []);

  return (
    <div className="kendaraan-container">
      <h1 className="kendaraan-title">Data Kendaraan</h1>

      {loading ? (
        <p className="info-text">Memuat data...</p>
      ) : kendaraan.length === 0 ? (
        <p className="info-text">Data kendaraan belum tersedia</p>
      ) : (
        <div className="table-wrapper">
          <table className="kendaraan-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Plat Nomor</th>
                <th>Jenis</th>
                <th>Transmisi</th>
                <th>BBM</th>
                <th>Tahun</th>
                <th>Kursi</th>
                <th>Kelengkapan</th>
                <th>Odometer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {kendaraan.map((item) => (
                <tr key={item.id}>
                  <td>{item.nama}</td>
                  <td>{item.platNomor}</td>
                  <td>{item.jenis}</td>
                  <td>{item.transmisi}</td>
                  <td>{item.bbm}</td>
                  <td>{item.tahun}</td>
                  <td>{item.kursi}</td>
                  <td>
                    {Array.isArray(item.kelengkapan)
                      ? item.kelengkapan.join(", ")
                      : "-"}
                  </td>
                  <td>{item.odometerTerakhir} km</td>
                  <td>
                    {item.statusAktif === "true" ? (
                      <span className="status aktif">Aktif</span>
                    ) : (
                      <span className="status nonaktif">Nonaktif</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminKendaraan;
