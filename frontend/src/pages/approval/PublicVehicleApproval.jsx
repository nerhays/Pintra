import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

function PublicVehicleApproval() {
  const [params] = useSearchParams();
  const bookingId = params.get("bookingId");
  const token = params.get("token");
  const approvalType = params.get("type"); // manager/operator/admin

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    if (!bookingId || !token) {
      setError("Link tidak valid");
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/approval/vehicle/verify?bookingId=${bookingId}&token=${token}`)
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

  const handleApprove = async () => {
    if (actionLoading || actionDone) return;

    const confirmed = window.confirm("Apakah Anda yakin ingin MENYETUJUI peminjaman kendaraan ini?");
    if (!confirmed) return;

    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/approval/vehicle/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          token,
          action: "APPROVE",
        }),
      });

      const result = await res.json();

      if (result.error) {
        alert("Error: " + result.error);
        setActionLoading(false);
        return;
      }

      setActionDone(true);
    } catch (err) {
      alert("Error: " + err.message);
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      alert("Alasan penolakan wajib diisi!");
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`${API_URL}/approval/vehicle/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          token,
          action: "REJECT",
          rejectNote: rejectNote.trim(),
        }),
      });

      const result = await res.json();

      if (result.error) {
        alert("Error: " + result.error);
        setActionLoading(false);
        return;
      }

      setActionDone(true);
      setShowRejectModal(false);
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

  const start = data.waktuPinjam ? new Date(data.waktuPinjam.seconds * 1000) : null;
  const end = data.waktuKembali ? new Date(data.waktuKembali.seconds * 1000) : null;

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "40px auto", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ background: "white", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "24px 32px", color: "white" }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>🚗 Approval Peminjaman Kendaraan</h2>
          <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: 14 }}>
            Tahap: <strong>{approvalType?.toUpperCase() || "APPROVAL"}</strong>
          </p>
        </div>

        <div style={{ padding: 32 }}>
          <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 8, marginBottom: 24, border: "1px solid #e9ecef" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>KENDARAAN</label>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#212529" }}>
                {data?.vehicle?.nama || "-"} • {data?.vehicle?.platNomor || "-"}
              </p>
              <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6c757d" }}>
                {data?.vehicle?.jenis || "-"} • {data?.vehicle?.tahun || "-"}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>PEMINJAM</label>
                <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>{data?.namaPeminjam}</p>
                <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6c757d" }}>{data?.divisi}</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>KEPERLUAN</label>
                <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>{data?.keperluan}</p>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>TUJUAN</label>
              <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>{data?.tujuan}</p>
            </div>

            {data?.nomorSurat && data.nomorSurat !== "-" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>NOMOR SURAT</label>
                <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>{data.nomorSurat}</p>
              </div>
            )}

            {data?.alasan && data.alasan !== "-" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>ALASAN</label>
                <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>{data.alasan}</p>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6c757d", marginBottom: 4, fontWeight: 600 }}>WAKTU PEMINJAMAN</label>
              {start && end && (
                <>
                  <p style={{ margin: 0, fontSize: 14, color: "#212529" }}>📅 {start.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#212529" }}>
                    🕐 {start.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </>
              )}
            </div>
          </div>

          <div style={{ background: "#fff3cd", border: "1px solid #ffc107", padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 14, color: "#856404" }}>
              ⚠️ <strong>Perhatian:</strong> Keputusan yang Anda buat tidak dapat dibatalkan. Mohon tinjau dengan seksama sebelum memberikan persetujuan.
            </p>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <button
              onClick={handleApprove}
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
            >
              {actionLoading ? "⏳ Memproses..." : "✅ Setujui"}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
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
            >
              {actionLoading ? "⏳ Memproses..." : "❌ Tolak"}
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 32,
              maxWidth: 500,
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Alasan Penolakan</h3>
            <p style={{ color: "#666", fontSize: 14 }}>Mohon jelaskan alasan penolakan peminjaman kendaraan ini:</p>

            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Contoh: Kendaraan sedang dalam perbaikan..."
              style={{
                width: "100%",
                minHeight: 100,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: "#e0e0e0",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: actionLoading ? "#ccc" : "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {actionLoading ? "Memproses..." : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicVehicleApproval;
