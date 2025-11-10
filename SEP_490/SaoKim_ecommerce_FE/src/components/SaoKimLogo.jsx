import { useState, useEffect } from "react";
import "./SaoKimLogo.css";

const LOGO_EXTENSIONS = ["png", "svg", "jpg", "jpeg", "webp"];

export default function SaoKimLogo({ size = "medium", showText = true }) {
  const [logoExists, setLogoExists] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkLogo = () => {
      LOGO_EXTENSIONS.forEach((ext) => {
        const img = new Image();
        img.onload = () => {
          if (!cancelled) setLogoExists(true);
        };
        img.onerror = () => {};
        img.src = `/images/saokim-logo.${ext}`;
      });
    };

    checkLogo();
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

  const renderSlogan = () =>
    showText ? (
      <div className="logo-slogan">
        <div className="logo-company">SaoKim Commerce</div>
        <small className="logo-tagline">Đồng hành chiếu sáng tương lai</small>
      </div>
    ) : null;

  if (logoExists) {
    return (
      <div className={`saokim-logo ${sizeClass}`}>
        <div className="logo-container">
          <img
            src="/images/saokim-logo.png"
            alt="SaoKim logo"
            className="logo-image"
            onError={(event) => {
              const element = event.currentTarget;
              const currentSrc = element.src;
              const baseSrc = currentSrc.replace(/\.(png|svg|jpg|jpeg|webp)$/i, "");
              const currentExt = currentSrc.match(/\.(\w+)$/i)?.[1]?.toLowerCase() ?? "png";
              const nextIndex = LOGO_EXTENSIONS.indexOf(currentExt) + 1;

              if (nextIndex < LOGO_EXTENSIONS.length) {
                element.src = `${baseSrc}.${LOGO_EXTENSIONS[nextIndex]}`;
              } else {
                setLogoExists(false);
              }
            }}
          />
          {renderSlogan()}
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
        {renderSlogan()}
      </div>
    </div>
  );
}
