import React from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import "./App.css";

import ChatWidget from "./components/chat/ChatWidget";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ResetPassword from "./pages/auth/ResetPassword";
import ForgotPassword from "./pages/auth/ForgotPassword";
import HomePage from "./pages/homepage/HomePage";
import AccessDenied from "./pages/auth/AccessDenied";
import ProtectedRoute from "./components/ProtectedRoute";
import VerifyRegister from "./pages/auth/VerifyRegister";
import About from "./pages/about/About";

import ReceivingList from "./pages/warehousemanager/ReceivingList";
import ReceivingCreate from "./pages/warehousemanager/ReceivingCreate.jsx";
import ReceivingSlipItems from "./pages/warehousemanager/ReceivingSlipItems";
import DispatchSlipItems from "./pages/warehousemanager/DispatchSlipItems";
import DispatchCreate from "./pages/warehousemanager/DispatchCreate.jsx";
import DispatchList from "./pages/warehousemanager/DispatchList";
import InboundReport from "./pages/warehousemanager/InboundReport";
import OutboundReport from "./pages/warehousemanager/OutboundReport";
import WarehouseReport from "./pages/warehousemanager/WarehouseReport";
import WarehouseDashboard from "./pages/warehousemanager/WarehouseDashboard";
import WarehouseInventory from "./pages/warehousemanager/WarehouseInventory";
import ProductTrace from "./pages/warehousemanager/ProductTrace";
import InventoryReport from "./pages/warehousemanager/InventoryReport";

import AdminLayout from "./layouts/AdminLayout";

import ProjectDetail from "./pages/ProjectManager/ProjectDetail";
import ProjectList from "./pages/ProjectManager/ProjectList";
import ProjectEdit from "./pages/ProjectManager/ProjectEdit";
import ProjectReport from "./pages/ProjectManager/ProjectReport.jsx";
import ProjectOverview from "./pages/ProjectManager/ProjectOverview.jsx";
import ManageProduct from "./pages/staff-manager/StaffManager.jsx";

import ProductDetail from "./pages/products/ProductDetail";
import ProductDetailPage from "./pages/staff-manager/products/ProductDetailPage";
import ProductsPage from "./pages/products/ProductsPage";
import Cart from "./pages/cart/Cart";
import Checkout from "./pages/cart/Checkout";
import CheckoutSuccess from "./pages/cart/CheckoutSuccess";
import CustomerOrder from "./pages/account/CustomerOrder";
import OrderDetailPage from "./pages/account/OrderDetailPage";
import AccountPage from "./pages/account/AccountPage";

import ManageCustomers from "./pages/staff-manager/staff-view-customers/ManageCustomers";
import StaffDashboard from "./pages/staff-manager/staff-dashboard/StaffDashboard";

import ManageInvoices from "./pages/staff-manager/invoices/ManageInvoices";
import InvoiceDetailStaff from "./pages/staff-manager/invoices/InvoiceDetailStaff";

import ManageOrders from "./pages/staff-manager/orders/ManageOrders";
import OrderDetailStaff from "./pages/staff-manager/orders/OrderDetailStaff";

import AdminDashboard from "./pages/admin/AdminDashboard";

import BannerList from "./pages/admin/banner/BannerList.jsx";
import BannerForm from "./pages/admin/banner/BannerForm.jsx";

import UserList from "./pages/admin/users/UserList";
import UserCreate from "./pages/admin/users/UserCreate";
import UserEdit from "./pages/admin/users/UserEdit";

import CustomerDetail from "./pages/staff-manager/staff-view-customers/CustomerDetail.jsx";

import ManagerLayout from "./layouts/ManagerLayout";
import ProjectManagerLayout from "./layouts/ProjectManagerLayout";
import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerProductList from "./pages/manager/products/ManagerProductList";
import ManagerOrderListPage from "./pages/manager/orders/ManagerOrderListPage";
import ManagerOrderDetailPage from "./pages/manager/orders/ManagerOrderDetailPage";

import ManagerProjectList from "./pages/manager/projects/ManagerProjectList";
import ManagerProjectCreate from "./pages/manager/projects/ManagerProjectCreate";
import ManagerProjectDetail from "./pages/manager/projects/ManagerProjectDetail";
import ManagerProjectEdit from "./pages/manager/projects/ManagerProjectEdit";
import ManagerProjectReport from "./pages/manager/projects/ManagerProjectReport";

import ManagerPromotionList from "./pages/manager/promotions/ManagerPromotionList";
import ManagerPromotionCreate from "./pages/manager/promotions/ManagerPromotionCreate";
import ManagerPromotionEdit from "./pages/manager/promotions/ManagerPromotionEdit";

import ManagerCouponList from "./pages/manager/coupons/ManagerCouponList";
import ManagerCouponCreate from "./pages/manager/coupons/ManagerCouponCreate";
import ManagerCouponEdit from "./pages/manager/coupons/ManagerCouponEdit";

import ManagerEmployeeList from "./pages/manager/employees/ManagerEmployeeList";
import ManagerEmployeeCreate from "./pages/manager/employees/ManagerEmployeeCreate";
import ManagerEmployeeEdit from "./pages/manager/employees/ManagerEmployeeEdit";

import ChatbotAnalyticsDashboard from "./pages/admin/chatbot/ChatbotAnalyticsDashboard";

function CustomerChatGate() {
  const { pathname } = useLocation();

  const hiddenPrefixes = ["/admin", "/manager", "/staff", "/warehouse-dashboard", "/projects"];
  const hiddenExact = ["/login", "/register", "/forgot-password", "/verify-register", "/forbidden"];
  const hiddenStartsWith = ["/reset-password"];

  const shouldHide =
    hiddenPrefixes.some((p) => pathname.startsWith(p)) ||
    hiddenExact.includes(pathname) ||
    hiddenStartsWith.some((p) => pathname.startsWith(p));

  if (shouldHide) return null;
  return <ChatWidget />;
}

export default function App() {
  return (
    <div className="page-wrapper">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-register" element={<VerifyRegister />} />
          <Route path="/change-password" element={<AccountPage initialTab="password" />} />
          <Route path="/forbidden" element={<AccessDenied />} />

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
              <Route path="warehouse-report/outbound-report" element={<OutboundReport />} />
              <Route path="warehouse-report/inventory-report" element={<InventoryReport />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow={["admin"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />

              <Route path="banner" element={<BannerList />} />
              <Route path="banner/create" element={<BannerForm />} />
              <Route path="banner/edit/:id" element={<BannerForm />} />

              <Route path="users" element={<UserList />} />
              <Route path="users/create" element={<UserCreate />} />
              <Route path="users/:id/edit" element={<UserEdit />} />

              <Route path="chatbot-analytics" element={<ChatbotAnalyticsDashboard />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allow={["staff"]} />}>
            <Route path="/staff/manager-dashboard" element={<StaffDashboard />} />
            <Route path="/staff/manager-products" element={<ManageProduct />} />
            <Route path="/staff/manager-products/:id" element={<ProductDetailPage />} />
            <Route path="/staff/manager-customers" element={<ManageCustomers />} />
            <Route path="/staff-view-customers/:id" element={<CustomerDetail />} />
            <Route path="/staff/manager-orders" element={<ManageOrders />} />
            <Route path="/staff/orders/:id" element={<OrderDetailStaff />} />
            <Route path="/staff/invoices" element={<ManageInvoices />} />
            <Route path="/staff/manager-invoices/:id" element={<InvoiceDetailStaff />} />
          </Route>

          <Route element={<ProtectedRoute allow={["project_manager"]} />}>
            <Route path="/projects" element={<ProjectManagerLayout />}>
              <Route index element={<ProjectList />} />
              <Route path="overview" element={<ProjectOverview />} />
              <Route path=":id" element={<ProjectDetail />} />
              <Route path=":id/edit" element={<ProjectEdit />} />
              <Route path=":id/report" element={<ProjectReport />} />
            </Route>
          </Route>

          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />

          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/addresses" element={<AccountPage initialTab="addresses" />} />
          <Route path="/account/orders" element={<CustomerOrder />} />
          <Route path="/account/orders/:orderId" element={<OrderDetailPage />} />

          <Route element={<ProtectedRoute allow={["manager"]} />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="dashboard" element={<ManagerDashboard />} />

              <Route path="orders" element={<ManagerOrderListPage />} />
              <Route path="orders/:orderId" element={<ManagerOrderDetailPage />} />

              <Route path="products" element={<ManagerProductList />} />

              <Route path="projects" element={<ManagerProjectList />} />
              <Route path="projects/create" element={<ManagerProjectCreate />} />
              <Route path="projects/:id" element={<ManagerProjectDetail />} />
              <Route path="projects/:id/edit" element={<ManagerProjectEdit />} />
              <Route path="projects/:id/report" element={<ManagerProjectReport />} />

              <Route path="promotions" element={<ManagerPromotionList />} />
              <Route path="promotions/create" element={<ManagerPromotionCreate />} />
              <Route path="promotions/:id/edit" element={<ManagerPromotionEdit />} />

              <Route path="coupons" element={<ManagerCouponList />} />
              <Route path="coupons/create" element={<ManagerCouponCreate />} />
              <Route path="coupons/:id/edit" element={<ManagerCouponEdit />} />

              <Route path="employees" element={<ManagerEmployeeList />} />
              <Route path="employees/create" element={<ManagerEmployeeCreate />} />
              <Route path="employees/:id/edit" element={<ManagerEmployeeEdit />} />
            </Route>
          </Route>

          <Route path="*" element={<div style={{ padding: 24 }}>Không tìm thấy trang.</div>} />
        </Routes>

        <CustomerChatGate />
      </BrowserRouter>
    </div>
  );
}
