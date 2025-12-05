import { useEffect, useState } from "react";
import "./SaoKimLogo.css";

const LOGO_EXTENSIONS = ["png", "svg", "jpg", "jpeg", "webp"];

export default function SaoKimLogo({
  size = "medium",
  showText = true,
  title = "Sao Kim Manager",
  tagline = "Không gian quản lý",
}) {
  const [logoExists, setLogoExists] = useState(false);

  useEffect(() => {
    let cancelled = false;
    LOGO_EXTENSIONS.forEach((ext) => {
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setLogoExists(true);
      };
      img.onerror = () => {};
      img.src = `/images/saokim-logo.${ext}`;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sizeClass =
    {
      small: "logo-small",
      medium: "logo-medium",
      large: "logo-large",
    }[size] || "logo-medium";

  const renderText = () =>
    showText ? (
      <div className="logo-slogan">
        <div className="logo-company">{title}</div>
        <small className="logo-tagline">{tagline}</small>
      </div>
    ) : null;

  if (logoExists) {
    return (
      <div className={`saokim-logo ${sizeClass}`}>
        <div className="logo-container">
          <img
            src="/images/saokim-logo.png"
            alt="Sao Kim logo"
            className="logo-image"
            onError={(event) => {
              const el = event.currentTarget;
              const base = el.src.replace(/\.(png|svg|jpg|jpeg|webp)$/i, "");
              const ext = el.src.match(/\.(\w+)$/i)?.[1]?.toLowerCase() ?? "png";
              const nextIdx = LOGO_EXTENSIONS.indexOf(ext) + 1;
              if (nextIdx < LOGO_EXTENSIONS.length) {
                el.src = `${base}.${LOGO_EXTENSIONS[nextIdx]}`;
              } else {
                setLogoExists(false);
              }
            }}
          />
          {renderText()}
        </div>
      </div>
    );
  }

  return (
    <div className={`saokim-logo ${sizeClass}`}>
      <div className="logo-container">
        <div className="logo-text">
          <span className="logo-s">S</span>
          <span className="logo-a-wrapper">
            <svg viewBox="0 0 100 100" className="logo-a" aria-hidden="true">
              <polygon
                points="50,15 58,38 82,38 63,53 71,77 50,62 29,77 37,53 18,38 42,38"
                fill="#1F5BFF"
              />
              <path
                d="M50,15 Q70,5 85,12 Q95,18 100,25"
                stroke="#F59F0B"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="logo-okim">OKIM</span>
        </div>
        {renderText()}
      </div>
    </div>
  );
}
