import {
  faCheck,
  faCog,
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
import { Link } from "react-router-dom";
import StaffLayout from "../../../layouts/StaffLayout"; 
import useCustomersApi from "../api/useCustomers";

export default function ManageCustomers() {
  // filter/sort/paging
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const { fetchCustomers } = useCustomersApi();
  const debouncedSearch = useDebounce(search, 400);

  const load = async (opts = {}) => {
    setLoading(true);
    try {
      const res = await fetchCustomers({
        q: opts.q ?? debouncedSearch,
        page: opts.page ?? page,
        pageSize: opts.pageSize ?? pageSize,
        sortBy: opts.sortBy ?? sortBy,
        sortDir: opts.sortDir ?? sortDir,
      });
      setRows(res?.items ?? []);
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 1);
      if (res?.page && res.page !== page) setPage(res.page);
      if (res?.pageSize && res.pageSize !== pageSize) setPageSize(res.pageSize);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, pageSize, sortBy, sortDir]);

  const onChangeSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const renderStatus = (s) =>
    (s ?? "").toLowerCase() === "active" ? (
      <Badge bg="success">Active</Badge>
    ) : (
      <Badge bg="secondary">Inactive</Badge>
    );

  return (
    <StaffLayout>
      {/* Header */}
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-md-0">
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
          <p className="mb-0">View registered accounts and purchase counts</p>
        </div>

        <div className="btn-toolbar mb-2 mb-md-0">{/* no create button */}</div>
      </div>

      {/* Search & Controls */}
      <div className="table-settings mb-4">
        <Row className="justify-content-between align-items-center">
          <Col xs={12} md={6} lg={5} xl={4}>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by name, email or phone"
                value={search}
                onChange={onChangeSearch}
              />
            </InputGroup>
          </Col>

          <Col xs="auto" className="ps-md-0 text-end">
            <Dropdown as={ButtonGroup}>
              <Dropdown.Toggle
                split
                as={Button}
                variant="link"
                className="text-dark m-0 p-0"
              >
                <span className="icon icon-sm icon-gray">
                  <FontAwesomeIcon icon={faCog} />
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-xs dropdown-menu-right">
                <Dropdown.Header>Show</Dropdown.Header>
                {[10, 20, 30, 50].map((n) => (
                  <Dropdown.Item
                    key={n}
                    className="d-flex fw-bold"
                    active={pageSize === n}
                    onClick={() => {
                      setPageSize(n);
                      setPage(1);
                    }}
                  >
                    {n}
                    {pageSize === n && (
                      <span className="icon icon-small ms-auto">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                    )}
                  </Dropdown.Item>
                ))}

                <Dropdown.Divider />
                <Dropdown.Header>Sort by</Dropdown.Header>
                <Dropdown.Item onClick={() => { setSortBy("id"); setSortDir("asc"); setPage(1); }}>
                  ID ↑
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("id"); setSortDir("desc"); setPage(1); }}>
                  ID ↓
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("name"); setSortDir("asc"); setPage(1); }}>
                  Name ↑
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("orders"); setSortDir("desc"); setPage(1); }}>
                  Orders ↓
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("spent"); setSortDir("desc"); setPage(1); }}>
                  Total Spent ↓
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("created"); setSortDir("desc"); setPage(1); }}>
                  Created ↓
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </div>

      {/* Table */}
      <Card border="light" className="table-wrapper table-responsive shadow-sm">
        <Card.Body className="pt-0">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>Total: {total}</div>
            {loading && (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />
                <span>Loading…</span>
              </div>
            )}
          </div>

          <Table hover className="user-table align-items-center mb-0">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th className="text-end">Orders</th>
                <th className="text-end">Total Spent</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td className="text-end">{c.ordersCount ?? c.orders ?? 0}</td>
                  <td className="text-end">
                    {(c.totalSpent ?? 0).toLocaleString("vi-VN")}đ
                  </td>
                  <td>{renderStatus(c.status)}</td>
                  <td>{formatDate(c.created)}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
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
            <Pagination className="mb-0">
              <Pagination.First disabled={page <= 1} onClick={() => setPage(1)} />
              <Pagination.Prev
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              {renderPageItems(page, totalPages, (p) => setPage(p))}
              <Pagination.Next
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    if (start > 2) items.push(<Pagination.Ellipsis key="s-ellipsis" disabled />);
  }
  for (let p = start; p <= end; p++) {
    items.push(
      <Pagination.Item key={p} active={p === current} onClick={() => onClick(p)}>
        {p}
      </Pagination.Item>
    );
  }
  if (end < total) {
    if (end < total - 1) items.push(<Pagination.Ellipsis key="e-ellipsis" disabled />);
    items.push(
      <Pagination.Item key={total} onClick={() => onClick(total)}>
        {total}
      </Pagination.Item>
    );
  }
  return items;
}

function formatDate(s) {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("vi-VN");
  } catch {
    return s;
  }
}
