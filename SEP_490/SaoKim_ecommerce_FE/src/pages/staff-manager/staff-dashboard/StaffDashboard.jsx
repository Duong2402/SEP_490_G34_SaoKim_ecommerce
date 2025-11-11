// src/pages/staff-dashboard/StaffDashboard.jsx
import { useEffect, useState } from "react";
import {
  Breadcrumb,
  Card,
  Row,
  Col,
  Badge,
  Button,
  Table,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBoxesStacked,
  faTriangleExclamation,
  faPlus,
  faFileInvoiceDollar,
  faCircleCheck,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Link, useNavigate } from "react-router-dom";
import StaffLayout from "../../../layouts/StaffLayout";

export default function StaffDashboard() {
  const navigate = useNavigate();

  // KPIs sản phẩm giữ nguyên
  const [kpi, setKpi] = useState({
    totalSku: 0,
    lowStock: 0,
    paidWeek: 0,     // hóa đơn đã thanh toán (tuần)
    unpaidWeek: 0,   // hóa đơn chưa thanh toán (tuần)
  });

  // Chart: Paid vs Unpaid theo ngày trong tuần
  const [chart, setChart] = useState([]); // [{ day:'Mon', paid:10, unpaid:7 }, ...]
  const [lowStock, setLowStock] = useState([]); // top 5 sắp hết
  const [pendingInvoices, setPendingInvoices] = useState([]); // top 5 chờ xử lý
  const [recentProducts, setRecentProducts] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);

  useEffect(() => {
    Promise.all([
      // Tổng hợp sản phẩm (đang có sẵn)
      fetch("/api/products/summary")
        .then((r) => r.json())
        .catch(() => ({ totalSku: 0, lowStock: 0 })),

      // Tóm tắt hóa đơn theo tuần
      fetch("/api/invoices/weekly-summary")
        .then((r) => r.json())
        .catch(() => ({ paid: [], unpaid: [] })),

      // Sản phẩm sắp hết
      fetch("/api/products/low-stock?top=5").then((r) => r.json()).catch(() => []),

      // Hóa đơn chờ xử lý (pending)
      fetch("/api/invoices/pending?top=5").then((r) => r.json()).catch(() => []),

      // Sản phẩm mới
      fetch("/api/products/recent?top=5").then((r) => r.json()).catch(() => []),

      // Hóa đơn mới
      fetch("/api/invoices/recent?top=5").then((r) => r.json()).catch(() => []),
    ]).then(([sum, week, low, pend, rp, ri]) => {
      setKpi({
        totalSku: sum.totalSku ?? 0,
        lowStock: sum.lowStock ?? 0,
        paidWeek: (week.paid?.reduce((s, x) => s + (x.count || 0), 0)) ?? 0,
        unpaidWeek: (week.unpaid?.reduce((s, x) => s + (x.count || 0), 0)) ?? 0,
      });

      // Hợp nhất theo day để vẽ chart Paid vs Unpaid
      const days =
        week.paid?.map((d) => d.day) ||
        week.unpaid?.map((d) => d.day) ||
        [];
      const byDay = days.map((d) => ({
        day: d,
        paid: week.paid?.find((x) => x.day === d)?.count || 0,
        unpaid: week.unpaid?.find((x) => x.day === d)?.count || 0,
      }));
      setChart(byDay);

      setLowStock(low);
      setPendingInvoices(pend);
      setRecentProducts(rp);
      setRecentInvoices(ri);
    });
  }, []);

  return (
    <StaffLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
            <Breadcrumb.Item as={Link} to="/staff/dashboard" active>
              <FontAwesomeIcon icon={faHome} /> Dashboard
            </Breadcrumb.Item>
          </Breadcrumb>
          <h4 className="mb-1">Tổng quan vận hành</h4>
          <p className="text-muted mb-0">
            Theo dõi nhanh sản phẩm và hóa đơn điện tử trong tuần.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" onClick={() => navigate("/staff/manager-products")}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Create Product
          </Button>
        </div>
      </div>

      {/* KPI */}
      <Row className="g-3">
        <Col md={3}>
          <Kpi
            icon={faBoxesStacked}
            label="SKU đang quản lý"
            value={kpi.totalSku}
          />
        </Col>
        <Col md={3}>
          <Kpi
            icon={faTriangleExclamation}
            label="SKU dưới định mức"
            value={kpi.lowStock}
            variant="warning"
          />
        </Col>
        <Col md={3}>
          <Kpi
            icon={faCircleCheck}
            label="HĐ đã thanh toán (tuần)"
            value={kpi.paidWeek}
          />
        </Col>
        <Col md={3}>
          <Kpi
            icon={faCircleExclamation}
            label="HĐ chưa thanh toán (tuần)"
            value={kpi.unpaidWeek}
          />
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        {/* Chart: Paid vs Unpaid */}
        <Col lg={7}>
          <Card className="h-100">
            <Card.Header>
              <strong>Hóa đơn theo ngày (Paid vs Unpaid)</strong>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={chart}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="paid" />
                  <Bar dataKey="unpaid" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Alerts: low stock + pending invoices */}
        <Col lg={5}>
          <Card className="h-100">
            <Card.Header>
              <strong>Cảnh báo ưu tiên</strong>
            </Card.Header>
            <Card.Body>
              <h6 className="mb-2">Sắp hết hàng</h6>
              <ul className="mb-3">
                {lowStock.map((x) => (
                  <li key={x.id}>
                    {x.sku} • {x.name} —{" "}
                    <Badge bg="warning" text="dark">
                      Stock: {x.stock}
                    </Badge>
                  </li>
                ))}
                {lowStock.length === 0 && (
                  <div className="text-muted">Không có cảnh báo.</div>
                )}
              </ul>

              <h6 className="mb-2">Hóa đơn chờ xử lý</h6>
              <ul className="mb-0">
                {pendingInvoices.map((d) => (
                  <li key={d.code}>
                    {d.code} — {d.customer} —{" "}
                    {(d.total || 0).toLocaleString("vi-VN")}đ —{" "}
                    <Badge
                      bg={
                        String(d.status || "").toLowerCase() === "paid"
                          ? "success"
                          : "secondary"
                      }
                    >
                      {d.status}
                    </Badge>
                  </li>
                ))}
                {pendingInvoices.length === 0 && (
                  <div className="text-muted">Không có hóa đơn chờ.</div>
                )}
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Two quick tables */}
      <Row className="g-3 mt-1">
        <Col lg={6}>
          <Card>
            <Card.Header>
              <strong>Recent Products</strong>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th className="text-end">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.sku}</td>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td className="text-end">
                        {(p.price || 0).toLocaleString("vi-VN")}đ
                      </td>
                    </tr>
                  ))}
                  {recentProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center text-muted py-3"
                      >
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card>
            <Card.Header>
              <strong>
                <FontAwesomeIcon
                  icon={faFileInvoiceDollar}
                  className="me-2"
                />
                Recent Invoices
              </strong>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Customer</th>
                    <th className="text-end">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((o) => (
                    <tr key={o.code}>
                      <td>{o.code}</td>
                      <td>{o.customer}</td>
                      <td className="text-end">
                        {(o.total || 0).toLocaleString("vi-VN")}đ
                      </td>
                      <td>
                        <Badge
                          bg={
                            String(o.status || "").toLowerCase() === "paid"
                              ? "success"
                              : "secondary"
                          }
                        >
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center text-muted py-3"
                      >
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </StaffLayout>
  );
}

function Kpi({ icon, label, value, variant }) {
  return (
    <Card className="h-100">
      <Card.Body className="d-flex align-items-center justify-content-between">
        <div>
          <div className="text-muted">{label}</div>
          <div className="fs-3 fw-bold">{value}</div>
        </div>
        <div
          className={`rounded p-3 ${
            variant === "warning" ? "bg-warning-subtle" : "bg-light"
          }`}
        >
          <FontAwesomeIcon icon={icon} />
        </div>
      </Card.Body>
    </Card>
  );
}
