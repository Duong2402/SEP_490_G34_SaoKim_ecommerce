import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  Card,
  Col,
  Row,
  Spinner,
  Form,
  Badge,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";

import StaffLayout from "../../../layouts/StaffLayout";
import useDashboardApi from "../api/useDashboard";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { getOverview, getRevenueByDay, getLatestOrders } = useDashboardApi();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Revenue-by-day
  const [revenueDays, setRevenueDays] = useState(7);
  const [revenueData, setRevenueData] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  // Latest orders
  const [latestOrders, setLatestOrders] = useState([]);
  const [loadingLatest, setLoadingLatest] = useState(true);

  // Load overview
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getOverview();
        setStats(res);
      } catch (e) {
        console.error(e);
        alert("Không tải được dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load revenue by day khi đổi khoảng ngày
  useEffect(() => {
    const loadRevenue = async () => {
      setLoadingRevenue(true);
      try {
        const res = await getRevenueByDay(revenueDays);
        setRevenueData(res ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRevenue(false);
      }
    };

    loadRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenueDays]);

  // Load latest orders
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxRevenue =
    revenueData && revenueData.length
      ? Math.max(...revenueData.map((x) => x.revenue || 0))
      : 0;

  const renderStatusBadge = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "pending")
      return (
        <Badge bg="warning" text="dark">
          Pending
        </Badge>
      );
    if (v === "shipping") return <Badge bg="info">Shipping</Badge>;
    if (v === "paid") return <Badge bg="primary">Paid</Badge>;
    if (v === "completed") return <Badge bg="success">Completed</Badge>;
    if (v === "cancelled") return <Badge bg="secondary">Cancelled</Badge>;
    return <Badge bg="secondary">{s || "Unknown"}</Badge>;
  };

  return (
    <StaffLayout>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div>
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item as={Link} to="/dashboard">
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
          </Breadcrumb>

          <h4>Staff Dashboard</h4>
        </div>
      </div>

      {loading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Summary cards - row 1 */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Total revenue</div>
                  <div className="fs-3">
                    {stats.totalRevenue.toLocaleString("vi-VN")}đ
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Revenue last 7 days</div>
                  <div className="fs-3">
                    {stats.revenue7d.toLocaleString("vi-VN")}đ
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Revenue today</div>
                  <div className="fs-3">
                    {(stats.revenueToday || 0).toLocaleString("vi-VN")}đ
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Orders today</div>
                  <div className="fs-3">{stats.ordersToday}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Summary cards - row 2 */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Pending orders</div>
                  <div className="fs-3">{stats.pendingOrders}</div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Products</div>
                  <div className="fs-3">{stats.productsCount}</div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="text-muted small">Customers</div>
                  <div className="fs-3">{stats.customersCount}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Revenue by day */}
          <Row className="mb-4">
            <Col md={12}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Revenue by day</h5>
                    <Form.Select
                      size="sm"
                      style={{ width: 160 }}
                      value={revenueDays}
                      onChange={(e) => setRevenueDays(Number(e.target.value))}
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                    </Form.Select>
                  </div>

                  {loadingRevenue && (
                    <div className="d-flex align-items-center gap-2 my-3">
                      <Spinner animation="border" size="sm" />
                      <span>Loading revenue…</span>
                    </div>
                  )}

                  {!loadingRevenue && revenueData.length === 0 && (
                    <div className="text-muted">No data</div>
                  )}

                  {!loadingRevenue && revenueData.length > 0 && (
                    <div>
                      {revenueData.map((item) => {
                        const value = item.revenue || 0;
                        const width =
                          maxRevenue > 0
                            ? Math.max(5, (value / maxRevenue) * 100)
                            : 0;

                        return (
                          <div
                            key={item.date}
                            className="d-flex align-items-center mb-2"
                          >
                            <div
                              style={{ width: 90 }}
                              className="small text-muted"
                            >
                              {formatDate(item.date)}
                            </div>
                            <div className="flex-grow-1">
                              <div
                                className="bg-primary rounded-pill"
                                style={{
                                  height: 8,
                                  width: `${width}%`,
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <div className="ms-2 small">
                              {value.toLocaleString("vi-VN")}đ
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Latest Orders */}
          <Row className="mb-4">
            <Col md={12}>
              <Card className="shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Latest Orders</h5>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate("/staff/manager-orders")}
                    >
                      View all orders
                    </button>
                  </div>

                  {loadingLatest && (
                    <div className="d-flex align-items-center gap-2 my-3">
                      <Spinner animation="border" size="sm" />
                      <span>Loading orders…</span>
                    </div>
                  )}

                  {!loadingLatest && latestOrders.length === 0 && (
                    <div className="text-muted">No orders</div>
                  )}

                  {!loadingLatest && latestOrders.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {latestOrders.map((o, idx) => (
                            <tr key={o.orderId}>
                              <td>{idx + 1}</td>
                              <td>{o.customerName}</td>
                              <td>
                                {(o.total ?? 0).toLocaleString("vi-VN")}đ
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
