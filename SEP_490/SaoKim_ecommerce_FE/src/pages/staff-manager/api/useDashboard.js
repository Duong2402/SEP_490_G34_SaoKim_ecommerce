export default function useDashboardApi() {
  const base = "/api/dashboard";

  async function handleJson(res, name) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[${name}]`, res.status, text);
      throw new Error(`${name} thất bại (mã ${res.status})`);
    }
    return res.json();
  }

  const getOverview = async () => {
    const res = await fetch(`${base}/overview`, {
      credentials: "include",
    });
    return handleJson(res, "Tải tổng quan");
  };

  const getRevenueByDay = async (days = 7) => {
    const res = await fetch(`${base}/revenue-by-day?days=${days}`, {
      credentials: "include",
    });
    return handleJson(res, "Tải doanh thu theo ngày");
  };

  const getLatestOrders = async (take = 5) => {
    const res = await fetch(`${base}/latest-orders?take=${take}`, {
      credentials: "include",
    });
    return handleJson(res, "Tải đơn hàng mới nhất");
  };

  return {
    getOverview,
    getRevenueByDay,
    getLatestOrders,
  };
}
