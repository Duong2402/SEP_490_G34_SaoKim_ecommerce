// src/http.js
import axios from "axios";

const isProd = import.meta.env.PROD;

// Dev: gọi tới "/api" để đi qua proxy; Prod: dùng VITE_API_BASE_URL
const http = axios.create({
  baseURL: isProd
    ? (import.meta.env.VITE_API_BASE_URL || "/")
    : "/api",
  // withCredentials: true, // bật nếu backend xác thực bằng cookie
  timeout: 15000,
});

// Chỉ lấy token trên browser
const getToken = () => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem("token") : null;
  } catch {
    return null;
  }
};

http.interceptors.request.use(
  (cfg) => {
    // Chỉ gắn Content-Type khi có body (POST/PUT...)
    if (cfg.data && !cfg.headers["Content-Type"]) {
      cfg.headers["Content-Type"] = "application/json";
    }
    const token = getToken();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  },
  (err) => Promise.reject(err)
);

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      try {
        ["token", "userEmail", "userName", "role"].forEach((k) => localStorage.removeItem(k));
      } catch {}
      // Cho header và các nơi khác sync lại
      window.dispatchEvent(new Event("auth:changed"));
      // Đưa về login, nhớ giữ lại redirect nếu cần
      const here = window.location.pathname + window.location.search + window.location.hash;
      const loginUrl = `/login?redirect=${encodeURIComponent(here)}`;
      if (window.location.pathname !== "/login") {
        window.location.assign(loginUrl);
      }
    }
    // Log gọn gàng
    const msg = err?.response?.data || err.message || "Network error";
    // eslint-disable-next-line no-console
    console.error("[HTTP]", status || "ERR", msg);
    return Promise.reject(err);
  }
);

export default http;
