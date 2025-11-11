// src/pages/staff-manager/invoices/ManageInvoices.jsx
import {
  faCheck,
  faCog,
  faHome,
  faSearch,
  faEye,
  faTrash,
  faMoneyBillWave,
  faDownload,
  faFilePdf,
  faWandMagicSparkles,
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
import Modal from "react-bootstrap/Modal";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StaffLayout from "../../../layouts/StaffLayout";
import useInvoicesApi from "../api/useInvoices";

export default function ManageInvoices() {
  // filter/sort/paging
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(""); // "", "Paid", "Pending", "Cancelled"
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("asc");

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // modal view
  const [viewing, setViewing] = useState(null);

  const {
    fetchInvoices,
    deleteInvoice,
    updateStatus,
    getInvoice,
    getPdfBlob,
    deletePdf,
    generatePdf,
  } = useInvoicesApi();

  const debouncedSearch = useDebounce(search, 400);

  const load = async (opts = {}) => {
    setLoading(true);
    try {
      const res = await fetchInvoices({
        q: opts.q ?? debouncedSearch,
        page: opts.page ?? page,
        pageSize: opts.pageSize ?? pageSize,
        sortBy: opts.sortBy ?? sortBy,
        sortDir: opts.sortDir ?? sortDir,
        status: opts && "status" in opts ? opts.status : status,
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
  }, [debouncedSearch, page, pageSize, sortBy, sortDir, status]);

  const renderStatus = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "paid") return <Badge bg="success">Paid</Badge>;
    if (v === "pending")
      return (
        <Badge bg="warning" text="dark">
          Pending
        </Badge>
      );
    if (v === "cancelled") return <Badge bg="secondary">Cancelled</Badge>;
    return <Badge bg="secondary">{s || "Unknown"}</Badge>;
  };

  const openView = async (id) => {
    try {
      const data = await getInvoice(id);
      setViewing(data);
    } catch (err) {
      console.error(err);
      alert("Load invoice failed");
    }
  };

  const markPaid = async (id) => {
    try {
      await updateStatus(id, "Paid");
      await load();
    } catch (err) {
      console.error(err);
      alert("Update status failed");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      await deleteInvoice(id);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  // PDF: preview inline (mở tab mới) — getPdfBlob trả về Blob trực tiếp
  const onPreviewPdf = async (id) => {
    try {
      const blob = await getPdfBlob(id, true); // inline=true
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      console.error(err);
      alert("Preview PDF failed");
    }
  };

  // PDF: download — getPdfBlob trả về Blob trực tiếp
  const onDownloadPdf = async (id, code) => {
    try {
      const blob = await getPdfBlob(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${code || "invoice"}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Download PDF failed");
    }
  };

  // PDF: generate theo nghiệp vụ (Paid mới cho phép, và nếu chưa có PDF)
  const onGeneratePdf = async (id) => {
    try {
      await generatePdf(id);
      await load();
    } catch (err) {
      console.error(err);
      alert("Generate PDF failed (invoice must be Paid)");
    }
  };

  // PDF: delete
  const onDeletePdf = async (id) => {
    if (!window.confirm("Delete attached PDF?")) return;
    try {
      await deletePdf(id);
      await load();
    } catch (err) {
      console.error(err);
      alert("Delete PDF failed");
    }
  };

  return (
    <StaffLayout>
      {/* Header */}
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-md-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/dashboard" }}>
  <FontAwesomeIcon icon={faHome} />
</Breadcrumb.Item>
            <Breadcrumb.Item>Invoices</Breadcrumb.Item>
            <Breadcrumb.Item active>Manage Invoices</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Manage Invoices</h4>
          <p className="mb-0">Xem, lọc và tải hóa đơn điện tử.</p>
        </div>
        <div className="btn-toolbar mb-2 mb-md-0" />
      </div>

      {/* Filters */}
      <div className="table-settings mb-4">
        <Row className="justify-content-between align-items-center">
          <Col xs={12} md={6} lg={5} xl={4}>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by code, customer, email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />  
            </InputGroup>
          </Col>

          <Col xs="auto" className="ps-md-0">
            <Form.Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </Form.Select>
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
                    setSortBy("code");
                    setSortDir("asc");
                    setPage(1);
                  }}
                >
                  Code ↑
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("total");
                    setSortDir("desc");
                    setPage(1);
                  }}
                >
                  Total ↓
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("status");
                    setSortDir("asc");
                    setPage(1);
                  }}
                >
                  Status ↑
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
                <th>Code</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th className="text-end">Total</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((i) => (
                <tr key={i.id}>
                  <td>{i.code}</td>
                  <td>{i.customer}</td>
                  <td>{i.email}</td>
                  <td>{i.phone}</td>
                  <td className="text-end">
                    {(i.total ?? 0).toLocaleString("vi-VN")}đ
                  </td>
                  <td>{renderStatus(i.status)}</td>
                  <td>{formatDate(i.created)}</td>
                  <td className="text-end">
                    <Button
                      variant="outline-info"
                      size="sm"
                      className="me-2"
                      title="View"
                      onClick={() => openView(i.id)}
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </Button>

                    <Button
                      variant="outline-dark"
                      size="sm"
                      className="me-2"
                      title="Preview PDF"
                      onClick={() => onPreviewPdf(i.id)}
                      disabled={!i.hasPdf}
                    >
                      <FontAwesomeIcon icon={faFilePdf} />
                    </Button>

                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      title="Generate PDF"
                      onClick={() => onGeneratePdf(i.id)}
                      disabled={
                        String(i.status || "").toLowerCase() !== "paid" || i.hasPdf
                      }
                    >
                      <FontAwesomeIcon icon={faWandMagicSparkles} />
                    </Button>

                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="me-2"
                      title="Download PDF"
                      onClick={() => onDownloadPdf(i.id, i.code)}
                      disabled={!i.hasPdf}
                    >
                      <FontAwesomeIcon icon={faDownload} />
                    </Button>

                    <Button
                      variant="outline-success"
                      size="sm"
                      className="me-2"
                      title="Mark Paid"
                      onClick={() => markPaid(i.id)}
                      disabled={String(i.status || "").toLowerCase() === "paid"}
                    >
                      <FontAwesomeIcon icon={faMoneyBillWave} />
                    </Button>

                    <Button
                      variant="outline-warning"
                      size="sm"
                      className="me-2"
                      title="Delete PDF"
                      onClick={() => onDeletePdf(i.id)}
                      disabled={!i.hasPdf}
                    >
                      <FontAwesomeIcon icon={faFilePdf} />
                    </Button>

                    <Button
                      variant="outline-danger"
                      size="sm"
                      title="Delete Invoice"
                      onClick={() => onDelete(i.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
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
            <Pagination className="mb-0">
              <Pagination.First
                disabled={page <= 1}
                onClick={() => setPage(1)}
              />
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

      {/* View modal */}
      <Modal show={!!viewing} onHide={() => setViewing(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Invoice Detail</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!viewing ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" />
              <span>Loading…</span>
            </div>
          ) : (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <div className="fw-bold">Code:</div>
                  <div>{viewing.invoiceCode || viewing.code}</div>
                </Col>
                <Col md={6}>
                  <div className="fw-bold">Status:</div>
                  <div>{renderStatus(viewing.paymentStatus || viewing.status)}</div>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col md={6}>
                  <div className="fw-bold">Customer:</div>
                  <div>{viewing.customerName || viewing.customer}</div>
                </Col>
                <Col md={6}>
                  <div className="fw-bold">Email / Phone:</div>
                  <div>
                    {(viewing.customerEmail || viewing.email) ?? "-"} /{" "}
                    {(viewing.customerPhone || viewing.phone) ?? "-"}
                  </div>
                </Col>
              </Row>
              <Table bordered size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th className="text-end">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewing.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{it.productName}</td>
                      <td className="text-end">{it.qty ?? it.quantity}</td>
                      <td className="text-end">
                        {(it.unitPrice ?? 0).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="text-end">
                        {(it.lineTotal ??
                          (it.qty || 0) * (it.unitPrice || 0)
                        ).toLocaleString("vi-VN")}
                        đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Row className="justify-content-end">
                <Col md={6}>
                  <Table borderless size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td className="text-muted">Subtotal</td>
                        <td className="text-end">
                          {(viewing.subtotal ?? 0).toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Discount</td>
                        <td className="text-end">
                          {(viewing.discount ?? 0).toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Tax</td>
                        <td className="text-end">
                          {(viewing.tax ?? 0).toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Total</td>
                        <td className="text-end fw-bold">
                          {(viewing.total ?? 0).toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
      </Modal>
    </StaffLayout>
  );
}

/** debounce như các trang khác */
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
    return new Date(s).toLocaleString("vi-VN");
  } catch {
    return s;
  }
}
