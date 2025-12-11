import http from "./http";

export async function getManagerOverview() {
  return await http.get("/manager/reports/overview");
}

export async function getRevenueByDay(days = 7) {
  return await http.get("/manager/reports/revenue-by-day", {
    params: { days },
  });
}
