import mask from "../assets/footer-bg.png";

function FooterOrnament() {
  return (
    <section style={styles.wrapper}>
      <img src="https://www.pelindo.co.id/media/mask_right_silver.png" alt="" style={styles.image} />
    </section>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    width: "100%",
    height: 180,
    overflow: "hidden",
  },
  image: {
    position: "absolute",
    right: 0,
    bottom: 0,
    height: "auto",
    width: "100%",
    maxWidth: "60vw",
  },
};

export default FooterOrnament;
