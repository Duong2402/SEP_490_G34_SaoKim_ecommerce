export default function useDashboardApi() {
  const base = "/api/dashboard";

  async function handleJson(res, name) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[${name}]`, res.status, text);
      throw new Error(`${name} failed (${res.status})`);
    }
    return res.json();
  }

  // Lấy tổng quan dashboard
  const getOverview = async () => {
    const res = await fetch(`${base}/overview`, {
      credentials: "include",
    });
    return handleJson(res, "Get overview");
  };

  // Lấy doanh thu theo ngày (7 ngày hoặc 30 ngày)
  const getRevenueByDay = async (days = 7) => {
    const res = await fetch(`${base}/revenue-by-day?days=${days}`, {
      credentials: "include",
    });
    return handleJson(res, "Get revenue by day");
  };
  // Lấy latest orders
  const getLatestOrders = async (take = 5) => {
    const res = await fetch(`${base}/latest-orders?take=${take}`, {
      credentials: "include",
    });
    return handleJson(res, "Get latest orders");
  };

  return {
    getOverview,
    getRevenueByDay,
    getLatestOrders,
  };
}
