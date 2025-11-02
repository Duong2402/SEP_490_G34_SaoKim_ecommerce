import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import { useLanguage } from "./i18n/LanguageProvider.jsx";

// Auth & commons
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgetPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Home from "./pages/commons/Home";

// Warehouse
import ReceivingList from "./pages/warehousemanager/ReceivingList";
import ReceivingSlipItems from "./pages/warehousemanager/ReceivingSlipItems";

// Projects
import ProjectDetail from "./pages/ProjectManager/ProjectDetail";
import ProjectList from "./pages/ProjectManager/ProjectList";
import ProjectCreate from "./pages/ProjectManager/ProjectCreate";
import ProjectEdit from "./pages/ProjectManager/ProjectEdit";

export default function App() {
  const { t } = useLanguage();

  return (
    <div className="page-wrapper">
      <LanguageSwitcher />
      <BrowserRouter>
        <Routes>
          {/* Commons */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Warehouse */}
          <Route path="/inbound" element={<Navigate to="/receiving-slips" replace />} />
          <Route path="/receiving-slips" element={<ReceivingList />} />
          <Route path="/receiving-slips/:id/items" element={<ReceivingSlipItems />} />

          {/* Projects */}
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/create" element={<ProjectCreate />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/edit" element={<ProjectEdit />} />

          {/* 404 */}
          <Route path="*" element={<div style={{ padding: 24 }}>{t("common.pageNotFound")}</div>} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
