import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ReceivingList from "./pages/warehousemanager/ReceivingList";
import ReceivingSlipItems from "./pages/warehousemanager/ReceivingSlipItems";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgetPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import HomeProductsBody from "./pages/homepage/HomeProductsBody";
import ProductDetail from "./pages/products/ProductDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeProductsBody />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/inbound" element={<Navigate to="/receiving-slips" replace />} />
        <Route path="/forgot-password" element={<ForgetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/receiving-slips" element={<ReceivingList />} />
        <Route path="/receiving-slips/:id/items" element={<ReceivingSlipItems />} />
      </Routes>
    </BrowserRouter>
  );
}
