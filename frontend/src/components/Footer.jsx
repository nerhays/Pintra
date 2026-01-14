 function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        {/* KANTOR REGIONAL */}
        <div>
          <p style={styles.title}>KANTOR REGIONAL 3</p>
          <p>
            PT Pelabuhan Indonesia (Persero)
            <br />
            Jl. Perak Timur No.620, Perak Utara,  
            Kec. Pabean Cantikan, Surabaya, Jawa Timur 60165
          </p>
        </div>

        {/* CUSTOMER CARE */}
        <div>
          <p style={styles.title}>CUSTOMER CARE PELINDO</p>
          <ul style={styles.list}>
            <li>Telepon: 031-3298631 – 7</li>
            <li>📞 102</li>
          </ul>
        </div>

        {/* INTERNAL SYSTEM */}
        <div>
          <p style={styles.title}>PELINDO INTERNAL SYSTEM</p>
          <p>
            Platform internal untuk mendukung kolaborasi dan kinerja seluruh insan Pelindo.
          </p>
        </div>
      </div>

      {/* CAPTION BOTTOM */}
      <div style={styles.caption}>
        Pelindo – Menghubungkan kinerja, membangun kepercayaan.
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: "#0b6db7",
    color: "#fff",
    padding: "60px 20px 30px",
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

  caption: {
    marginTop: 50,
    textAlign: "center",
    fontSize: 16,
    fontWeight: 500,
    opacity: 0.9,
    borderTop: "1px solid rgba(255,255,255,0.2)",
    paddingTop: 20,
  },
};

export default Footer;
