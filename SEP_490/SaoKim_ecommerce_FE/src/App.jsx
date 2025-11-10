import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import { useLanguage } from "./i18n/LanguageProvider.jsx";

// Auth & commons
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgetPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import HomeProductsBody from "./pages/homepage/HomeProductsBody";

// Warehouse
import ReceivingList from "./pages/warehousemanager/ReceivingList";
import ReceivingSlipItems from "./pages/warehousemanager/ReceivingSlipItems";
import DispatchSlipItems from "./pages/warehousemanager/DispatchSlipItems";
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

//Products
import ProductDetail from "./pages/products/ProductDetail";
import Cart from "./pages/cart/Cart";
import Checkout from "./pages/cart/Checkout";
import CheckoutSuccess from "./pages/cart/CheckoutSuccess";
import Profile from "./pages/account/Profile";
import Addresses from "./pages/account/Addresses";

// Users
import UserList from "./pages/users/UserList";
import UserCreate from "./pages/users/UserCreate";
import UserEdit from "./pages/users/UserEdit";


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
          <Route path="/forgot-password" element={<ForgetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Warehouse */}
          <Route path="/warehouse-dashboard" element={<WarehouseDashboard />} />
          <Route path="/warehouse-dashboard/receiving-slips" element={<ReceivingList />} />
          <Route path="/warehouse-dashboard/receiving-slips/:id/items" element={<ReceivingSlipItems />} />
          <Route path="/warehouse-dashboard/dispatch-slips" element={<DispatchList />} />
          <Route path="/warehouse-dashboard/dispatch-slips/:id/items" element={<DispatchSlipItems />} />
          <Route path="/warehouse-dashboard/inventory" element={<WarehouseInventory />} />
          <Route path="/warehouse-dashboard/trace" element={<ProductTrace />} />
          <Route path="/warehouse-dashboard/warehouse-report" element={<WarehouseReport />} />
          <Route path="/warehouse-dashboard/warehouse-report/inbound-report" element={<InboundReport />} />

          {/* Projects */}
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/create" element={<ProjectCreate />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/edit" element={<ProjectEdit />} />

          {/* Products */}
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />

          {/* Account */}
          <Route path="/account" element={<Profile />} />
          <Route path="/account/addresses" element={<Addresses />} />

          {/* Users Management */}
          <Route path="/users" element={<UserList />} />
          <Route path="/users/create" element={<UserCreate />} />
          <Route path="/users/:id/edit" element={<UserEdit />} />

          {/* 404 */}
          <Route path="*" element={<div style={{ padding: 24 }}>{t("common.pageNotFound")}</div>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
