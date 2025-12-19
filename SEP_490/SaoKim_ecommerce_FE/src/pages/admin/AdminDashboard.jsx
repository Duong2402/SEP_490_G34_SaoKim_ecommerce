// AdminDashboard.jsx
import { Link } from "react-router-dom";
import { FaImage, FaUsers, FaRobot } from "react-icons/fa";

const features = [
  {
    to: "/admin/banner",
    icon: FaImage,
    title: "Quản lý Banner",
    desc: "Tạo, chỉnh sửa và quản lý hiển thị các banner trên trang chủ",
  },
  {
    to: "/admin/users",
    icon: FaUsers,
    title: "Quản lý Users",
    desc: "Quản lý tài khoản người dùng, phân quyền và trạng thái hoạt động",
  },
  {
    to: "/admin/chatbot-analytics",
    icon: FaRobot,
    title: "Báo cáo Chatbot",
    desc: "Thống kê lượt chat, tỷ lệ thành công và CTR sản phẩm từ chatbot",
  },
];

export default function AdminDashboard() {
  return (
    <div className="admin-section">
      {/* Welcome Panel */}
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">Xin chào, Admin!</h2>
            <p className="admin-panel__subtitle">
              Chào mừng bạn đến với trang quản trị hệ thống Sao Kim. Chọn một
              chức năng bên dưới để bắt đầu.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <h2 className="admin-panel__title">Công cụ quản trị</h2>
            <p className="admin-panel__subtitle">
              Truy cập nhanh các chức năng quản lý hệ thống
            </p>
          </div>
        </div>

        <div className="admin-grid">
          {features.map((feature) => (
            <Link
              key={feature.to}
              to={feature.to}
              className="admin-feature-card"
            >
              <div className="admin-feature-card__icon">
                <feature.icon />
              </div>
              <h3 className="admin-feature-card__title">{feature.title}</h3>
              <p className="admin-feature-card__desc">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
