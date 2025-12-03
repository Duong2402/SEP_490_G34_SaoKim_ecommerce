import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge, Breadcrumb, Card, Col, Form, Row, Spinner } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";

import StaffLayout from "../../../layouts/StaffLayout";
import useDashboardApi from "../api/useDashboard";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { getOverview, getRevenueByDay, getLatestOrders } = useDashboardApi();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [revenueDays, setRevenueDays] = useState(7);
  const [revenueData, setRevenueData] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    revenueData && revenueData.length ? Math.max(...revenueData.map((x) => x.revenue || 0)) : 0;

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
          <p className="staff-page-lead">Tổng quan hiệu suất bán hàng và vận hành</p>
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
                  <div className="fs-3">{stats.totalRevenue.toLocaleString("vi-VN")} ₫</div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Doanh thu 7 ngày</div>
                  <div className="fs-3">{stats.revenue7d.toLocaleString("vi-VN")} ₫</div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3}>
              <Card className="staff-panel">
                <Card.Body>
                  <div className="text-muted small">Doanh thu hôm nay</div>
                  <div className="fs-3">{(stats.revenueToday || 0).toLocaleString("vi-VN")} ₫</div>
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
                    <h5 className="staff-panel__title mb-0">Doanh thu theo ngày</h5>
                    <Form.Select
                      size="sm"
                      style={{ width: 180 }}
                      value={revenueDays}
                      onChange={(e) => setRevenueDays(Number(e.target.value))}
                    >
                      <option value={7}>7 ngày gần nhất</option>
                      <option value={30}>30 ngày gần nhất</option>
                    </Form.Select>
                  </div>

                  {loadingRevenue && (
                    <div className="d-flex align-items-center gap-2 my-3">
                      <Spinner animation="border" size="sm" />
                      <span>Đang tải doanh thu...</span>
                    </div>
                  )}

                  {!loadingRevenue && revenueData.length === 0 && (
                    <div className="text-muted">Chưa có dữ liệu</div>
                  )}

                  {!loadingRevenue && revenueData.length > 0 && (
                    <div>
                      {revenueData.map((item) => {
                        const value = item.revenue || 0;
                        const width = maxRevenue > 0 ? Math.max(5, (value / maxRevenue) * 100) : 0;

                        return (
                          <div key={item.date} className="d-flex align-items-center mb-2">
                            <div style={{ width: 90 }} className="small text-muted">
                              {formatDate(item.date)}
                            </div>
                            <div className="flex-grow-1">
                              <div
                                className="rounded-pill"
                                style={{
                                  height: 10,
                                  width: `${width}%`,
                                  transition: "width 0.3s ease",
                                  background: "var(--staff-blue-600)",
                                }}
                              />
                            </div>
                            <div className="ms-2 small">{value.toLocaleString("vi-VN")} ₫</div>
                          </div>
                        );
                      })}
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
                    <h5 className="staff-panel__title mb-0">Đơn hàng mới nhất</h5>
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
                            <th>ID</th>
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
                              <td>{(o.total ?? 0).toLocaleString("vi-VN")} ₫</td>
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
