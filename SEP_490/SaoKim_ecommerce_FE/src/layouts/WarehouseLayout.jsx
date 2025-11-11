import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeadset, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import WarehouseSidebar from "../components/WarehouseSidebar";
import "../assets/css/Warehouse.css";

const WarehouseLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userEmail");
    if (!window.confirm("Bạn có chắc muốn đăng xuất?")) return;

    navigate("/login", { replace: true });
  };

  const userEmail = localStorage.getItem("userEmail") || "warehouse@saokim.vn";

  return (
    <div className="warehouse-shell">
      <WarehouseSidebar />

      <div className="warehouse-main">
        <header className="warehouse-topbar">
          <div className="warehouse-topbar__titles">
            <span className="warehouse-topbar__subtitle">Sao Kim Lighting</span>
            <h2 className="warehouse-topbar__title">Điều hành quản lý kho</h2>
          </div>

          <div className="warehouse-topbar__actions">
            <span className="warehouse-topbar__btn warehouse-topbar__btn--ghost">
              <FontAwesomeIcon icon={faHeadset} />
              0963 811 369
            </span>

            <button
              type="button"
              className="warehouse-topbar__btn"
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              Đăng xuất
            </button>

            <button
              type="button"
              className="warehouse-topbar__profile"
              aria-label="Thông tin quản lý kho"
            >
              <span className="warehouse-topbar__avatar">WM</span>
              <span className="warehouse-topbar__profile-text">
                <strong>Quản lý kho</strong>
                <small>{userEmail}</small>
              </span>
            </button>
          </div>
        </header>

        <div className="warehouse-content">{children}</div>
      </div>
    </div>
  );
};

export default WarehouseLayout;

