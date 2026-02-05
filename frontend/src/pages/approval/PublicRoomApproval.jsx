import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

function PublicRoomApproval() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId");
  const token = params.get("token");

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // ✅ LOADING STATE
  const [actionDone, setActionDone] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    if (!bookingId || !token) {
      setError("Link tidak valid");
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/approval/room/verify?bookingId=${bookingId}&token=${token}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        setData(res);
      })
      .catch((err) => {
        setError(err.message || "Link tidak valid / expired");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [bookingId, token, API_URL]);

  const action = async (type) => {
    if (actionLoading || actionDone) return;

    // ✅ KONFIRMASI DULU
    const confirmed = window.confirm(type === "APPROVE" ? "Apakah Anda yakin ingin MENYETUJUI peminjaman ini?" : "Apakah Anda yakin ingin MENOLAK peminjaman ini?");

    if (!confirmed) return;

    setActionLoading(true); // ✅ SET LOADING

    try {
      const res = await fetch(`${API_URL}/approval/room/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          token,
          action: type,
        }),
      });

      const result = await res.json();

      if (result.error) {
        alert("Error: " + result.error);
        setActionLoading(false);
        return;
      }

      setActionDone(true);
      // No alert needed, akan tampil di UI
    } catch (err) {
      alert("Error: " + err.message);
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <p style={{ fontSize: 18, color: "#666" }}>Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
          <h3 style={{ color: "#f44336", marginBottom: 8 }}>{error}</h3>
          <p style={{ color: "#666" }}>Link tidak valid atau sudah kedaluwarsa</p>
        </div>
      </div>
    );
  }

  if (actionDone) {
    return (
      <div style={{ padding: 24, textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 500 }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>✅</div>
          <h2 style={{ color: "#4CAF50", marginBottom: 16 }}>Approved!</h2>
          <p style={{ fontSize: 16, color: "#666", lineHeight: 1.6 }}>Terima kasih atas persetujuan Anda. Sistem telah mencatat keputusan Anda dan akan melanjutkan ke tahap approval berikutnya.</p>
          <div style={{ marginTop: 32, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
            <p style={{ margin: 0, color: "#888", fontSize: 14 }}>Anda dapat menutup halaman ini.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "40px auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "white", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "24px 32px", color: "white" }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>🏢 Approval Peminjaman Ruang</h2>
          <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: 14 }}>Mohon tinjau detail peminjaman di bawah ini</p>
        </div>

        {/* Content */}
        <div style={{ padding: 32 }}>
          {/* Info Box */}
          <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 8, marginBottom: 24, border: "1px solid #e9ecef" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>KEGIATAN</label>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#212529" }}>{data?.namaKegiatan}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>PEMINJAM</label>
                <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>{data?.peminjam?.nama}</p>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6c757d" }}>{data?.peminjam?.divisi}</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>JUMLAH PESERTA</label>
                <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>{data?.peserta} orang</p>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>WAKTU</label>
              {data && data.waktuMulai && data.waktuSelesai && (
                <>
                  {(() => {
                    // ✅ Parse dari Firestore timestamp format
                    const start = new Date(data.waktuMulai.seconds * 1000);
                    const end = new Date(data.waktuSelesai.seconds * 1000);

                    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                      return <p style={{ color: "#f44336", margin: 0, fontSize: 14 }}>Format tanggal tidak valid</p>;
                    }

                    return (
                      <>
                        <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>
                          📅{" "}
                          {start.toLocaleDateString("id-ID", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>

                        <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#212529" }}>
                          🕐{" "}
                          {start.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {end.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

          {/* Warning */}
          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 14, color: "#856404" }}>
              ⚠️ <strong>Perhatian:</strong> Keputusan yang Anda buat tidak dapat dibatalkan. Mohon tinjau dengan seksama sebelum memberikan persetujuan.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 16 }}>
            <button
              onClick={() => action("APPROVE")}
              disabled={actionLoading}
              style={{
                flex: 1,
                padding: "16px 24px",
                background: actionLoading ? "#ccc" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: actionLoading ? "not-allowed" : "pointer",
                fontSize: 16,
                fontWeight: 600,
                transition: "all 0.3s",
                boxShadow: actionLoading ? "none" : "0 2px 4px rgba(76, 175, 80, 0.3)",
              }}
              onMouseEnter={(e) => !actionLoading && (e.target.style.background = "#45a049")}
              onMouseLeave={(e) => !actionLoading && (e.target.style.background = "#4CAF50")}
            >
              {actionLoading ? "⏳ Memproses..." : "✅ Setujui"}
            </button>
            <button
              onClick={() => action("REJECT")}
              disabled={actionLoading}
              style={{
                flex: 1,
                padding: "16px 24px",
                background: actionLoading ? "#ccc" : "#f44336",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: actionLoading ? "not-allowed" : "pointer",
                fontSize: 16,
                fontWeight: 600,
                transition: "all 0.3s",
                boxShadow: actionLoading ? "none" : "0 2px 4px rgba(244, 67, 54, 0.3)",
              }}
              onMouseEnter={(e) => !actionLoading && (e.target.style.background = "#da190b")}
              onMouseLeave={(e) => !actionLoading && (e.target.style.background = "#f44336")}
            >
              {actionLoading ? "⏳ Memproses..." : "❌ Tolak"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicRoomApproval;
