import {
  faCheck,
  faCog,
  faDownload,
  faHome,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Breadcrumb,
  Button,
  ButtonGroup,
  Card,
  Col,
  Dropdown,
  Form,
  InputGroup,
  Row,
  Table,
  Pagination,
  Spinner,
} from "@themesberg/react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import StaffLayout from "../../../layouts/StaffLayout";
import useCustomersApi from "../api/useCustomers";

export default function ManageCustomers() {
  const navigate = useNavigate();
  const { fetchCustomers, updateCustomerStatus, exportCustomers } =
    useCustomersApi();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createdFrom, setCreatedFrom] = useState(null);
  const [createdTo, setCreatedTo] = useState(null);
  const [minSpend, setMinSpend] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchCustomers({
        q: debouncedSearch,
        status,
        createdFrom: createdFrom ? createdFrom.toISOString() : undefined,
        createdTo: createdTo ? createdTo.toISOString() : undefined,
        minSpend: minSpend || undefined,
        minOrders: minOrders || undefined,
        sortBy,
        sortDir,
        page,
        pageSize,
      });

      setRows(res.items ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(Math.max(1, Math.ceil(res.total / res.pageSize)));
    } catch (error) {
      console.error(error);
      alert("Không tải được danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    status,
    createdFrom,
    createdTo,
    minSpend,
    minOrders,
    page,
    pageSize,
    sortBy,
    sortDir,
  ]);

  const renderStatus = (isBanned) =>
    isBanned ? (
      <Badge bg="secondary">Banned</Badge>
    ) : (
      <Badge bg="success">Active</Badge>
    );

  const handleToggleBan = async (row) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn ${row.isBanned ? "mở khóa" : "khóa"} khách hàng này?`
      )
    )
      return;

    try {
      await updateCustomerStatus(row.id, !row.isBanned);
      await load();
    } catch (error) {
      console.error(error);
      alert("Cập nhật trạng thái thất bại");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportCustomers({
        q: debouncedSearch,
        status,
        createdFrom: createdFrom ? createdFrom.toISOString() : undefined,
        createdTo: createdTo ? createdTo.toISOString() : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Đổi sang .xlsx
      a.download = `customers_${new Date()
        .toISOString()
        .replace(/[-:T.]/g, "")
        .slice(0, 14)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Export thất bại");
    } finally {
      setExporting(false);
    }
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
            <Breadcrumb.Item>Customers</Breadcrumb.Item>
            <Breadcrumb.Item active>Manage Customers</Breadcrumb.Item>
          </Breadcrumb>

          <h4>Manage Customers</h4>
        </div>

        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          <FontAwesomeIcon icon={faDownload} className="me-2" />
          {exporting ? "Exporting..." : "Export Excel"}
        </Button>
      </div>

      {/* Search + Filters */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Label>Search</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Name, email, phone"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </InputGroup>
            </Col>

            <Col md={2}>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Created from</Form.Label>
              <DatePicker
                selected={createdFrom}
                onChange={(date) => {
                  setCreatedFrom(date);
                  setPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="dd/MM/yyyy"
                className="form-control"
                isClearable
              />
            </Col>

            <Col md={2}>
              <Form.Label>Created to</Form.Label>
              <DatePicker
                selected={createdTo}
                onChange={(date) => {
                  setCreatedTo(date);
                  setPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="dd/MM/yyyy"
                className="form-control"
                isClearable
              />
            </Col>

            <Col md={2}>
              <Form.Label>Min spend</Form.Label>
              <Form.Control
                type="number"
                value={minSpend}
                onChange={(e) => {
                  setMinSpend(e.target.value);
                  setPage(1);
                }}
              />
            </Col>

            <Col md={2}>
              <Form.Label>Min orders</Form.Label>
              <Form.Control
                type="number"
                value={minOrders}
                onChange={(e) => {
                  setMinOrders(e.target.value);
                  setPage(1);
                }}
              />
            </Col>

            <Col md="auto" className="ms-auto">
              <Dropdown as={ButtonGroup}>
                <Dropdown.Toggle
                  split
                  as={Button}
                  variant="link"
                  className="text-dark m-0 p-0"
                >
                  <FontAwesomeIcon icon={faCog} />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Header>Show</Dropdown.Header>
                  {[10, 20, 30, 50].map((n) => (
                    <Dropdown.Item
                      key={n}
                      active={pageSize === n}
                      onClick={() => {
                        setPageSize(n);
                        setPage(1);
                      }}
                    >
                      {n}
                      {pageSize === n && (
                        <FontAwesomeIcon icon={faCheck} className="ms-2" />
                      )}
                    </Dropdown.Item>
                  ))}

                  <Dropdown.Divider />
                  <Dropdown.Header>Sort by</Dropdown.Header>

                  <Dropdown.Item
                    onClick={() => {
                      setSortBy("created");
                      setSortDir("desc");
                      setPage(1);
                    }}
                  >
                    Created ↓
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      setSortBy("orders");
                      setSortDir("desc");
                      setPage(1);
                    }}
                  >
                    Orders ↓
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      setSortBy("totalSpend");
                      setSortDir("desc");
                      setPage(1);
                    }}
                  >
                    Total spend ↓
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      setSortBy("lastOrder");
                      setSortDir("desc");
                      setPage(1);
                    }}
                  >
                    Last order ↓
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <Card.Body className="pt-0">
          <div className="d-flex justify-content-between mb-2">
            <div>Total: {total}</div>
            {loading && (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />
                <span>Loading…</span>
              </div>
            )}
          </div>

          <Table hover className="user-table mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th className="text-end">Orders</th>
                <th className="text-end">Total Spend</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>
                    <Button
                      variant="link"
                      className="p-0"
                      onClick={() => navigate(`/staff-view-customers/${c.id}`)}
                    >
                      {c.name}
                    </Button>
                  </td>
                  <td>{c.email}</td>
                  <td>{c.phoneNumber}</td>
                  <td className="text-end">{c.ordersCount}</td>
                  <td className="text-end">
                    {(c.totalSpend ?? 0).toLocaleString("vi-VN")}đ
                  </td>
                  <td>{renderStatus(c.isBanned)}</td>
                  <td>{formatDate(c.createAt)}</td>
                  <td className="text-end">
                    <Button
                      size="sm"
                      variant={c.isBanned ? "success" : "outline-danger"}
                      onClick={() => handleToggleBan(c)}
                    >
                      {c.isBanned ? "Unban" : "Ban"}
                    </Button>
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              Page {page} / {totalPages}
            </div>
            <Pagination>
              <Pagination.First
                disabled={page <= 1}
                onClick={() => setPage(1)}
              />
              <Pagination.Prev
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />

              {renderPageItems(page, totalPages, setPage)}

              <Pagination.Next
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
              />
              <Pagination.Last
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              />
            </Pagination>
          </div>
        </Card.Body>
      </Card>
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

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function renderPageItems(current, total, onClick) {
  const items = [];
  const win = 2;

  const start = Math.max(1, current - win);
  const end = Math.min(total, current + win);

  if (start > 1) {
    items.push(
      <Pagination.Item key={1} onClick={() => onClick(1)}>
        1
      </Pagination.Item>
    );
    if (start > 2)
      items.push(<Pagination.Ellipsis disabled key="s-ellipsis" />);
  }

  for (let p = start; p <= end; p++) {
    items.push(
      <Pagination.Item
        key={p}
        active={p === current}
        onClick={() => onClick(p)}
      >
        {p}
      </Pagination.Item>
    );
  }

  if (end < total) {
    if (end < total - 1)
      items.push(<Pagination.Ellipsis disabled key="e-ellipsis" />);
    items.push(
      <Pagination.Item key={total} onClick={() => onClick(total)}>
        {total}
      </Pagination.Item>
    );
  }

  return items;
}
