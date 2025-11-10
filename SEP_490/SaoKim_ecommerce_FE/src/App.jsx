import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./App.css";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import { useLanguage } from "./i18n/LanguageProvider.jsx";

// Auth & commons
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import ForgotPassword from "./pages/auth/ForgotPassword";
import HomeProductsBody from "./pages/homepage/HomeProductsBody";
import AccessDenied from "./pages/auth/AccessDenied";
import ProtectedRoute from "./components/ProtectedRoute";

// Warehouse
import ReceivingList from "./pages/warehousemanager/ReceivingList";
import ReceivingCreate from "./pages/warehousemanager/ReceivingCreate.jsx";
import ReceivingSlipItems from "./pages/warehousemanager/ReceivingSlipItems";
import DispatchSlipItems from "./pages/warehousemanager/DispatchSlipItems";
import DispatchCreate from "./pages/warehousemanager/DispatchCreate.jsx";
import DispatchList from "./pages/warehousemanager/DispatchList";
import InboundReport from "./pages/warehousemanager/InboundReport";
import WarehouseReport from "./pages/warehousemanager/WarehouseReport";
import WarehouseDashboard from "./pages/warehousemanager/WarehouseDashboard";
import WarehouseInventory from "./pages/warehousemanager/WarehouseInventory";
import ProductTrace from "./pages/warehousemanager/ProductTrace";

// Projects
import ProjectDetail from "./pages/ProjectManager/ProjectDetail";
import ProjectList from "./pages/ProjectManager/ProjectList";
import ProjectCreate from "./pages/ProjectManager/ProjectCreate";
import ProjectEdit from "./pages/ProjectManager/ProjectEdit";

// Products
import ProductDetail from "./pages/products/ProductDetail";
import ManageProduct from "./pages/staff-manager/StaffManager.jsx";

export default function App() {
  const { t } = useLanguage();

  return (
    <div className="page-wrapper">
      <LanguageSwitcher />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomeProductsBody />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/forbidden" element={<AccessDenied />} />
          

          {/* Warehouse protected group */}
          <Route element={<ProtectedRoute allow={["warehouse_manager"]} />}>
            <Route path="/warehouse-dashboard" element={<Outlet />}>
              <Route index element={<WarehouseDashboard />} />
              <Route path="receiving-slips" element={<ReceivingList />} />
              <Route path="receiving-slips/create" element={<ReceivingCreate />} />
              <Route path="receiving-slips/:id/items" element={<ReceivingSlipItems />} />
              <Route path="dispatch-slips" element={<DispatchList />} />
              <Route path="dispatch-slips/create" element={<DispatchCreate />} />
              <Route path="dispatch-slips/:id/items" element={<DispatchSlipItems />} />
              <Route path="inventory" element={<WarehouseInventory />} />
              <Route path="trace" element={<ProductTrace />} />
              <Route path="warehouse-report" element={<WarehouseReport />} />
              <Route path="warehouse-report/inbound-report" element={<InboundReport />} />
            </Route>
          </Route>

          {/* Projects - public hoặc bạn tự bảo vệ thêm nếu cần */}
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/create" element={<ProjectCreate />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/edit" element={<ProjectEdit />} />

          {/* Products */}
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/products" element={<ManageProduct />} />

          {/* 404 */}
          <Route path="*" element={<div style={{ padding: 24 }}>{t("common.pageNotFound")}</div>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
