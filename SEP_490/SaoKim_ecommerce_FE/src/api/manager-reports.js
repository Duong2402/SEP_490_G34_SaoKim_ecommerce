// src/api/manager-reports.js
import http from "./http";

// Lấy overview cho Manager: revenue + warehouse + projects
export async function getManagerOverview() {
  // BE route: /api/manager/reports/overview
  // baseURL dev đang là "/api" nên chỉ cần "/manager/..."
  return await http.get("/manager/reports/overview");
}

// Lấy doanh thu theo ngày để vẽ chart (mặc định 7 ngày)
export async function getRevenueByDay(days = 7) {
  return await http.get("/manager/reports/revenue-by-day", {
    params: { days },
  });
}
