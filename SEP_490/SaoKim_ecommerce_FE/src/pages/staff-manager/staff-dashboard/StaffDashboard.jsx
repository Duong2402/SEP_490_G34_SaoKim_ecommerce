import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Breadcrumb,
  Card,
  Col,
  Form,
  Row,
  Spinner,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";

import StaffLayout from "../../../layouts/StaffLayout";
import useDashboardApi from "../api/useDashboard";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { getOverview, getRevenueByDay, getLatestOrders } = useDashboardApi();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [revenueRaw, setRevenueRaw] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [revenueMode, setRevenueMode] = useState("day"); 

  const [latestOrders, setLatestOrders] = useState([]);
  const [loadingLatest, setLoadingLatest] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getOverview();
        setStats(res);
      } catch (e) {
        console.error(e);
        alert("Không tải được dữ liệu tổng quan");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadRevenue = async () => {
      setLoadingRevenue(true);
      try {
        const res = await getRevenueByDay(365); 
        setRevenueRaw(res ?? []);
      } catch (e) {
        console.error(e);
        setRevenueRaw([]);
      } finally {
        setLoadingRevenue(false);
      }
    };

    loadRevenue();
  }, []);

  useEffect(() => {
    const loadLatest = async () => {
      setLoadingLatest(true);
      try {
        const res = await getLatestOrders(5);
        setLatestOrders(res ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLatest(false);
      }
    };

    loadLatest();
  }, []);


  const revenueSeries = useMemo(() => {
    if (!revenueRaw || !revenueRaw.length) return [];

    const normalized = revenueRaw
      .map((item) => ({
        date: item.date,
        revenue: item.revenue || 0,
        dateObj: new Date(item.date),
      }))
      .sort((a, b) => a.dateObj - b.dateObj);

    if (revenueMode === "day") {
      const last30 = normalized.slice(-30);
      return last30.map((x) => ({
        label: formatDateShort(x.date),
        revenue: x.revenue,
      }));
    }

    if (revenueMode === "week") {
      const groups = {};
      for (const x of normalized) {
        const d = x.dateObj;
        const year = d.getFullYear();
        const week = getWeekNumber(d); 
        const key = `${year}-W${week}`;
        if (!groups[key]) {
          groups[key] = { label: `Tuần ${week}/${year}`, revenue: 0 };
        }
        groups[key].revenue += x.revenue;
      }
      return Object.values(groups);
    }

    if (revenueMode === "month") {
      const groups = {};
      for (const x of normalized) {
        const d = x.dateObj;
        const year = d.getFullYear();
        const month = d.getMonth() + 1; 
        const key = `${year}-${month}`;
        if (!groups[key]) {
          groups[key] = {
            label: `T${month}/${year}`,
            revenue: 0,
          };
        }
        groups[key].revenue += x.revenue;
      }
      return Object.values(groups);
    }

    return [];
  }, [revenueRaw, revenueMode]);

  const maxRevenue =
    revenueSeries && revenueSeries.length
      ? Math.max(...revenueSeries.map((x) => x.revenue || 0))
      : 0;

  const renderStatusBadge = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "pending")
      return (
        <Badge bg="warning" text="dark">
          Chờ xử lý
        </Badge>
      );
    if (v === "shipping") return <Badge bg="info">Đang giao</Badge>;
    if (v === "paid") return <Badge bg="primary">Đã thanh toán</Badge>;
    if (v === "completed") return <Badge bg="success">Hoàn tất</Badge>;
    if (v === "cancelled") return <Badge bg="secondary">Đã hủy</Badge>;
    return <Badge bg="secondary">{s || "Không xác định"}</Badge>;
  };

  return (
    <StaffLayout>
      <div className="staff-page-header">
        <div>
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item as={Link} to="/staff/manager-dashboard">
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Bảng điều khiển</Breadcrumb.Item>
          </Breadcrumb>
          <h4 className="staff-page-title">Bảng điều khiển nhân viên</h4>
          <p className="staff-page-lead">
            Tổng quan hiệu suất bán hàng và vận hành
          </p>
        </div>
      </div>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && stats && (
        <>
          <Row className="mb-4 g-3">
            <Col md={3}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Doanh thu tích lũy</div>
                  <div className="fs-3">
                    {stats.totalRevenue.toLocaleString("vi-VN")} ₫
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Doanh thu 7 ngày</div>
                  <div className="fs-3">
                    {stats.revenue7d.toLocaleString("vi-VN")} ₫
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Doanh thu hôm nay</div>
                  <div className="fs-3">
                    {(stats.revenueToday || 0).toLocaleString("vi-VN")} ₫
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Đơn hàng hôm nay</div>
                  <div className="fs-3">{stats.ordersToday}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4 g-3">
            <Col md={4}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Đơn đang chờ</div>
                  <div className="fs-3">{stats.pendingOrders}</div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Sản phẩm đang bán</div>
                  <div className="fs-3">{stats.productsCount}</div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Khách hàng</div>
                  <div className="fs-3">{stats.customersCount}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={12}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="staff-panel__title mb-0">
                      Doanh thu theo thời gian
                    </h5>
                    <Form.Select
                      size="sm"
                      style={{ width: 220 }}
                      value={revenueMode}
                      onChange={(e) => setRevenueMode(e.target.value)}
                    >
                      <option value="day">Theo ngày (30 ngày gần nhất)</option>
                      <option value="week">Theo tuần</option>
                      <option value="month">Theo tháng</option>
                    </Form.Select>
                  </div>

                  {loadingRevenue && (
                    <div className="d-flex align-items-center gap-2 my-3">
                      <Spinner animation="border" size="sm" />
                      <span>Đang tải doanh thu...</span>
                    </div>
                  )}

                  {!loadingRevenue && revenueSeries.length === 0 && (
                    <div className="text-muted">Chưa có dữ liệu</div>
                  )}

                  {!loadingRevenue && revenueSeries.length > 0 && (
                    <div style={{ width: "100%", height: 260 }}>
                      <ResponsiveContainer>
                        <AreaChart data={revenueSeries} margin={{ left: 0 }}>
                          <defs>
                            <linearGradient
                              id="revenueGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#2563eb"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="100%"
                                stopColor="#2563eb"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v) =>
                              v >= 1_000_000
                                ? `${Math.round(v / 1_000_000)}tr`
                                : v.toLocaleString("vi-VN")
                            }
                          />
                          <Tooltip
                            formatter={(value) =>
                              `${Number(value).toLocaleString("vi-VN")} ₫`
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#2563eb"
                            fill="url(#revenueGradient)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={true}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div className="mt-2 small text-muted">
                        Đỉnh gần nhất:{" "}
                        {maxRevenue
                          ? maxRevenue.toLocaleString("vi-VN")
                          : 0}{" "}
                        ₫
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={12}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="staff-panel__title mb-0">
                      Đơn hàng mới nhất
                    </h5>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate("/staff/manager-orders")}
                    >
                      Xem tất cả đơn
                    </button>
                  </div>

                  {loadingLatest && (
                    <div className="d-flex align-items-center gap-2 my-3">
                      <Spinner animation="border" size="sm" />
                      <span>Đang tải đơn hàng...</span>
                    </div>
                  )}

                  {!loadingLatest && latestOrders.length === 0 && (
                    <div className="text-muted">Chưa có đơn hàng</div>
                  )}

                  {!loadingLatest && latestOrders.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Khách hàng</th>
                            <th>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {latestOrders.map((o, idx) => (
                            <tr key={o.orderId}>
                              <td>{idx + 1}</td>
                              <td>{o.customerName}</td>
                              <td>
                                {(o.total ?? 0).toLocaleString("vi-VN")} ₫
                              </td>
                              <td>{renderStatusBadge(o.status)}</td>
                              <td>{formatDate(o.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </StaffLayout>
  );
}


function formatDate(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("vi-VN");
  } catch {
    return s;
  }
}

function formatDateShort(s) {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return s;
  }
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}
