import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import { useLanguage } from "./i18n/LanguageProvider.jsx";

// Auth & commons
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import ForgotPassword from "./pages/auth/ForgotPassword";
import HomeProductsBody from "./pages/homepage/HomeProductsBody";

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

// Projects module (cũ)
import ProjectDetail from "./pages/ProjectManager/ProjectDetail";
import ProjectList from "./pages/ProjectManager/ProjectList";
import ProjectCreate from "./pages/ProjectManager/ProjectCreate";
import ProjectEdit from "./pages/ProjectManager/ProjectEdit";
import ProjectReport from "./pages/ProjectManager/ProjectReport.jsx";

// Products (staff manager)
import ProductDetail from "./pages/products/ProductDetail";
import ManageProduct from "./pages/staff-manager/StaffManager.jsx";

// Manager area
import ManagerLayout from "./layouts/ManagerLayout";
import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerProductList from "./pages/manager/products/ManagerProductList";

// Manager Projects
import ManagerProjectList from "./pages/manager/projects/ManagerProjectList";
import ManagerProjectCreate from "./pages/manager/projects/ManagerProjectCreate";
import ManagerProjectDetail from "./pages/manager/projects/ManagerProjectDetail";
import ManagerProjectEdit from "./pages/manager/projects/ManagerProjectEdit";

// *** NEW: Promotions ***
import ManagerPromotionList from "./pages/manager/promotions/ManagerPromotionList";

export default function App() {
  const { t } = useLanguage();

  return (
    <div className="page-wrapper">
      <LanguageSwitcher />
      <BrowserRouter>
        <Routes>
          {/* Commons */}
          <Route path="/" element={<HomeProductsBody />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Warehouse */}
          <Route path="/warehouse-dashboard" element={<WarehouseDashboard />} />
          <Route path="/warehouse-dashboard/receiving-slips" element={<ReceivingList />} />
          <Route path="/warehouse-dashboard/receiving-slips/create" element={<ReceivingCreate />} />
          <Route path="/warehouse-dashboard/receiving-slips/:id/items" element={<ReceivingSlipItems />} />
          <Route path="/warehouse-dashboard/dispatch-slips" element={<DispatchList />} />
          <Route path="/warehouse-dashboard/dispatch-slips/create" element={<DispatchCreate />} />
          <Route path="/warehouse-dashboard/dispatch-slips/:id/items" element={<DispatchSlipItems />} />
          <Route path="/warehouse-dashboard/inventory" element={<WarehouseInventory />} />
          <Route path="/warehouse-dashboard/trace" element={<ProductTrace />} />
          <Route path="/warehouse-dashboard/warehouse-report" element={<WarehouseReport />} />
          <Route path="/warehouse-dashboard/warehouse-report/inbound-report" element={<InboundReport />} />

          {/* Projects (ngoài khu Manager) */}
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/create" element={<ProjectCreate />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/edit" element={<ProjectEdit />} />
          <Route path="/projects/:id/report" element={<ProjectReport />} />

          {/* Products (ngoài khu Manager) */}
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/products" element={<ManageProduct />} />

          {/* Manager area */}
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<ManagerDashboard />} />
            <Route path="dashboard" element={<ManagerDashboard />} />

            {/* Products cho Manager */}
            <Route path="products" element={<ManagerProductList />} />

            {/* Projects cho Manager */}
            <Route path="projects" element={<ManagerProjectList />} />
            <Route path="projects/create" element={<ManagerProjectCreate />} />
            <Route path="projects/:id" element={<ManagerProjectDetail />} />
            <Route path="projects/:id/edit" element={<ManagerProjectEdit />} />

            {/* *** Promotions cho Manager *** */}
            <Route path="promotions" element={<ManagerPromotionList />} />
          </Route>

          {/* 404 */}
          <Route
            path="*"
            element={<div style={{ padding: 24 }}>{t("common.pageNotFound")}</div>}
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
