import { useNavigate } from "react-router-dom";
import "./RoomCard.css";
import { getMainImageDataUrl } from "../utils/getMainImage";

function RoomCard({ room, date, start, end }) {
  const navigate = useNavigate();
  const imageSrc = getMainImageDataUrl(room.photos);

  const handleBook = () => {
    navigate(`/room/book/${room.id}?date=${date}&start=${start}&end=${end}`);
  };

  return (
    <div className="room-card">
      <div className="room-image">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={room.namaRuang}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />
        ) : (
          <div className="room-image-placeholder">🏢</div>
        )}
      </div>

      <div className="room-info">
        <h3>{room.namaRuang}</h3>

        <div className="room-spec">
          <p>📍 Lokasi: {room.lokasi || "Tidak tersedia"}</p>
          <p>👥 Kapasitas: {room.kapasitas || "-"} orang</p>
          {room.fasilitas && <p>✨ Fasilitas: {room.fasilitas}</p>}
        </div>

        <div className="room-schedule">
          <strong>📅 Jadwal Booking:</strong>
          <p>{new Date(date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          <p>
            🕐 {start} - {end}
          </p>
        </div>

        <button className="btn-book" onClick={handleBook}>
          Booking Ruangan Ini
        </button>
      </div>
    </div>
  );
}

export default RoomCard;
