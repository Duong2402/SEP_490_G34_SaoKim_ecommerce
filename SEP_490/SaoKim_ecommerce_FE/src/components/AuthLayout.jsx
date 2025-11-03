import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons";

const AuthLayout = ({
  children,
  illustration,
  badge = "Sao Kim Lighting",
  headline,
  subHeadline,
  insights = [],
  footerNote,
  backLink = { to: "/", label: "Quay lại trang chủ" },
}) => {
  useEffect(() => {
    document.body.classList.add("auth-body");
    return () => {
      document.body.classList.remove("auth-body");
    };
  }, []);

  const asideStyle = illustration
    ? {
        backgroundImage: `linear-gradient(170deg, rgba(47, 115, 224, 0.92), rgba(27, 78, 179, 0.88)), url(${illustration})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <main className="auth-screen">
      <div className="auth-shell">
        <aside className="auth-visual" style={asideStyle}>
          {badge && <span className="auth-visual__badge">{badge}</span>}

          <div className="auth-visual__copy">
            {headline && <h2 className="auth-visual__title">{headline}</h2>}
            {subHeadline && <p className="auth-visual__subtitle">{subHeadline}</p>}
            {insights.length > 0 && (
              <ul className="auth-visual__insights">
                {insights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          {footerNote && <div className="auth-visual__footer">{footerNote}</div>}
        </aside>

        <section className="auth-content">
          {backLink && (
            <div className="auth-content__back">
              <Link to={backLink.to} className="auth-content__back-link">
                <FontAwesomeIcon icon={faAngleLeft} />
                <span>{backLink.label}</span>
              </Link>
            </div>
          )}

          <div className="auth-content__inner">{children}</div>
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;
