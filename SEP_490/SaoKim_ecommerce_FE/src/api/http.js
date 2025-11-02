import axios from "axios";

// Dùng proxy /api trong vite.config → không set origin/cổng ở đây
const http = axios.create({
  baseURL: "",               // hoặc "/"
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

const getToken = () => {
  // Chỉ truy cập localStorage khi chạy trên browser
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("token");
  }
  return null;
};

http.interceptors.request.use(
  (cfg) => {
    const token = getToken();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  },
  (err) => Promise.reject(err)
);

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data || err.message;
    console.error("HTTP error:", status, data);
    return Promise.reject(err);
  }
);

export default http;
