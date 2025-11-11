import React from "react";
import { Button } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import "../../assets/css/Auth.css";

export default function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8f9ff 0%, #edf1ff 100%)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 28px rgba(0,0,0,0.1)",
          textAlign: "center",
          padding: "3rem 2rem",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: "50%",
            backgroundColor: "#f0f3ff",
            marginBottom: "1.5rem",
          }}
        >
          <FontAwesomeIcon icon={faLock} size="2x" color="#1f5bff" />
        </div>

        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Truy cập bị từ chối
        </h1>
        <p style={{ fontSize: "1rem", color: "#6c757d", marginBottom: "2rem" }}>
          Bạn không có quyền truy cập vào trang này.  
          Vui lòng kiểm tra vai trò tài khoản hoặc đăng nhập bằng tài khoản khác.
        </p>

        <div className="d-flex flex-column gap-2 align-items-center">
          <Button
            variant="primary"
            onClick={() => navigate(-1)}
            style={{ minWidth: 200 }}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Quay lại trang trước
          </Button>

          <Button
            variant="outline-secondary"
            onClick={() => navigate("/login")}
            style={{ minWidth: 200 }}
          >
            Đăng nhập lại
          </Button>
        </div>
      </div>
    </div>
  );
}
