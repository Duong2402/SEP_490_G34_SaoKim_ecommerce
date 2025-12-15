import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/manager/dashboard", label: "Tổng quan" },
  { to: "/manager/orders", label: "Đơn hàng" },
  { to: "/manager/products", label: "Sản phẩm" },
  { to: "/manager/projects", label: "Dự án" },
  { to: "/manager/promotions", label: "Khuyến mãi" },
  { to: "/manager/coupons", label: "Mã giảm giá" },
  { to: "/manager/employees", label: "Nhân sự" },
];

export default function ManagerSidebar({ onNavigate }) {
  return (
    <nav className="manager-sidebar__nav" aria-label="Điều hướng quản lý">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `manager-nav-link${isActive ? " manager-nav-link--active" : ""}`
          }
          onClick={onNavigate}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
