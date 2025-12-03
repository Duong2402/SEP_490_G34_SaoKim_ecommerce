// src/http.js
import axios from "axios";

// Lấy base URL từ env, ví dụ: https://localhost:7022
let API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "";

// Bỏ dấu / ở cuối nếu có
if (API_BASE.endsWith("/")) {
  API_BASE = API_BASE.slice(0, -1);
}

// Tất cả request sẽ đi tới: {API_BASE}/api/...
// Ví dụ: https://localhost:7022/api/banner
const http = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Accept-Language": "vi",
  },
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
    // Gắn Content-Type khi có body (POST/PUT...)
    if (cfg.data && !cfg.headers["Content-Type"]) {
      cfg.headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) {
      cfg.headers.Authorization = `Bearer ${token}`;
    }

    return cfg;
  },
  (err) => Promise.reject(err),
);

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      try {
        ["token", "userEmail", "userName", "role"].forEach((k) => localStorage.removeItem(k));
      } catch {}

      window.dispatchEvent(new Event("auth:changed"));

      const here =
        window.location.pathname + window.location.search + window.location.hash;
      const loginUrl = `/login?redirect=${encodeURIComponent(here)}`;

      if (window.location.pathname !== "/login") {
        window.location.assign(loginUrl);
      }
    }

    const msg = err?.response?.data || err.message || "Network error";
    // eslint-disable-next-line no-console
    console.error("[HTTP]", status || "ERR", msg);

    return Promise.reject(err);
  },
);

export default http;
