import { useState, useEffect } from "react";
import "./SaoKimLogo.css";

export default function SaoKimLogo({ size = "medium", showText = true }) {
  const [logoExists, setLogoExists] = useState(false);
  const sizeClass = {
    small: "logo-small",
    medium: "logo-medium",
    large: "logo-large"
  }[size] || "logo-medium";

  // Kiểm tra xem file logo có tồn tại không
  useEffect(() => {
    const checkLogo = async () => {
      const logoExtensions = ['png', 'svg', 'jpg', 'jpeg', 'webp'];
      for (const ext of logoExtensions) {
        try {
          const img = new Image();
          img.src = `/images/saokim-logo.${ext}`;
          img.onload = () => setLogoExists(true);
          img.onerror = () => {};
        } catch (e) {}
      }
    };
    checkLogo();
  }, []);

  // Nếu có file logo, sử dụng ảnh
  if (logoExists) {
    return (
      <div className={`saokim-logo ${sizeClass}`}>
        <div className="logo-container">
          <img 
            src="/images/saokim-logo.png" 
            alt="SaoKim Logo" 
            className="logo-image"
            onError={(e) => {
              // Thử các extension khác nếu png không tồn tại
              const extensions = ['svg', 'jpg', 'jpeg', 'webp'];
              const currentSrc = e.target.src;
              const baseSrc = currentSrc.replace(/\.(png|svg|jpg|jpeg|webp)$/i, '');
              const currentExt = currentSrc.match(/\.(\w+)$/i)?.[1] || 'png';
              const nextIndex = extensions.indexOf(currentExt.toLowerCase()) + 1;
              
              if (nextIndex < extensions.length) {
                e.target.src = `${baseSrc}.${extensions[nextIndex]}`;
              } else {
                setLogoExists(false); // Fallback về SVG nếu không tìm thấy file nào
              }
            }}
          />
          {showText && (
            <div className="logo-slogan">
              <div className="logo-company">SaoKim E-commerce</div>
              <small className="logo-tagline">LOA ĐÈN KHÔNG BAO GIỜ TẮT</small>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: Dùng SVG nếu không có file ảnh
  return (
    <div className={`saokim-logo ${sizeClass}`}>
      <div className="logo-container">
        <div className="logo-text">
          <span className="logo-s">S</span>
          <span className="logo-a-wrapper">
            <svg viewBox="0 0 100 100" className="logo-a">
              {/* Ngôi sao 5 cánh màu xanh dương */}
              <polygon
                points="50,15 58,38 82,38 63,53 71,77 50,62 29,77 37,53 18,38 42,38"
                fill="#0066CC"
              />
              {/* Đường cong cam từ đỉnh ngôi sao */}
              <path
                d="M50,15 Q70,5 85,12 Q95,18 100,25"
                stroke="#FF6600"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="logo-okim">OKIM</span>
        </div>
        {showText && (
          <div className="logo-slogan">
            <div className="logo-company">SaoKim E-commerce</div>
            <small className="logo-tagline">LOA ĐÈN KHÔNG BAO GIỜ TẮT</small>
          </div>
        )}
      </div>
    </div>
  );
}

