// Подпис „Сайт от Hristiyan Ivanov“ – води към портфолиото. Цветът се взима от футъра.
export default function SiteSignature() {
  return (
    <p style={{ margin: 0, padding: "10px 16px", textAlign: "right", fontSize: 12, lineHeight: 1.2 }}>
      <a
        href="https://hristian-ivanov.netlify.app/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", opacity: 0.7, textDecoration: "none" }}
      >
        Сайт от <b style={{ fontWeight: 600 }}>Hristiyan Ivanov</b>
      </a>
    </p>
  );
}
