function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        {/* KANTOR PUSAT */}
        <div>
          <p style={styles.title}>KANTOR REGIONAL 3</p>
          <p>
            PT Pelabuhan Indonesia (Persero)
            <br />
            Jl. Perak Timur No.620, Perak Utara, Kec. Pabean Cantikan, Surabaya, Jawa Timur 60165
            <br />
            <br />
            CUSTOMER CARE PELINDO
            <br />
            📞 102
            <br />
            Telepon:  031- 3298631 – 7
          </p>
        </div>

        {/* LINK TERKAIT */}
        <div>
          <p style={styles.title}>LINK TERKAIT</p>
          <ul style={styles.list}>
            <li>Danantara Indonesia</li>
            <li>Kementerian BUMN RI</li>
            <li>Kementerian Perhubungan RI</li>
          </ul>
        </div>

        {/* SOCIAL MEDIA */}
        <div>
          <p style={styles.title}>SOCIAL MEDIA</p>
          <div style={styles.social}>
            <span>🐦</span>
            <span>📘</span>
            <span>📷</span>
            <span>▶️</span>
            <span>🎵</span>
          </div>
        </div>

        {/* WIDGET */}
        <div>
          <p style={styles.title}>INFO PUBLIK</p>
          <div style={styles.widget}>Widget Kominfo</div>
        </div>
      </div>
    </footer>
  );
}
const styles = {
  footer: {
    backgroundColor: "#0b6db7",
    color: "#fff",
    padding: "60px 20px",
  },

  container: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 40,
  },

  title: {
    fontWeight: 600,
    marginBottom: 16,
  },

  list: {
    listStyle: "none",
    padding: 0,
    lineHeight: 2,
  },

  social: {
    display: "flex",
    gap: 16,
    fontSize: 20,
  },

  widget: {
    background: "#fff",
    color: "#000",
    padding: 12,
    borderRadius: 6,
  },
};

export default Footer;
