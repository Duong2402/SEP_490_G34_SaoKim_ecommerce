import { useNavigate } from "react-router-dom";
import StaffSidebar from "../components/StaffSidebar";

const StaffLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      ["token", "userEmail", "userName", "role"].forEach((k) =>
        localStorage.removeItem(k)
      );
    } catch {123}

    window.dispatchEvent(new Event("auth:changed"));
    navigate("/login");
  };

  // Lấy tên staff trong localStorage nếu có
  const staffName = localStorage.getItem("userName") || "Staff";

  return (
    <div
      className="d-flex"
      style={{ minHeight: "100vh", width: "100vw", overflowX: "hidden" }}
    >
      <StaffSidebar />

      <div
        className="flex-grow-1 bg-light"
        style={{ minHeight: "100vh", width: "100%" }}
      >
        {/* Header cố định */}
        <div
          className="d-flex justify-content-between align-items-center bg-white shadow-sm px-4 py-3 sticky-top"
          style={{ zIndex: 100 }}
        >
          <div></div>

          <div className="d-flex align-items-center gap-3">
            <span className="text-secondary small">Hello, {staffName}</span>

            <button
              className="btn btn-outline-primary btn-sm"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Nội dung trang */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default StaffLayout;
