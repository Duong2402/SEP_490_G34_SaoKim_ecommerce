import {
  faCheck,
  faCog,
  faDownload,
  faEye,
  faFilePdf,
  faHome,
  faPaperPlane,
  faSearch,
  faTrash,
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
  Form,
  InputGroup,
  Pagination,
  Row,
  Spinner,
  Table,
} from "@themesberg/react-bootstrap";
import { Dropdown } from "react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StaffLayout from "../../../layouts/StaffLayout";
import useInvoicesApi from "../api/useInvoices";

export default function ManageInvoices() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("asc");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [sendingId, setSendingId] = useState(null);

  const {
    fetchInvoices,
    deleteInvoice,
    getPdfBlob,
    deletePdf,
    generatePdf,
    sendInvoiceEmail,
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
      });

      const items = res?.items ?? [];
      const total = res?.total ?? 0;
      const ps = res?.pageSize ?? pageSize;
      const tp = Math.max(1, Math.ceil(total / ps));

      setRows(items);
      setTotal(total);
      setTotalPages(tp);
      if (page > tp) setPage(tp);
    } catch (e) {
      console.error(e);
      alert("Không tải được danh sách hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, pageSize, sortBy, sortDir]);

  const renderStatus = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "paid") return <Badge bg="success">Đã thanh toán</Badge>;
    if (v === "pending")
      return (
        <Badge bg="warning" text="dark">
          Chờ thanh toán
        </Badge>
      );
    if (v === "cancelled") return <Badge bg="secondary">Đã hủy</Badge>;
    return <Badge bg="secondary">{s || "Không xác định"}</Badge>;
  };

  const openView = (id) => {
    navigate(`/staff/manager-invoices/${id}`);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Xóa hóa đơn này?")) return;
    try {
      await deleteInvoice(id);
      if (rows.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
    } catch (err) {
      console.error(err);
      alert("Xóa hóa đơn thất bại");
    }
  };

  const onPreviewPdf = async (id) => {
    try {
      const blob = await getPdfBlob(id, true);
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      console.error(err);
      alert("Xem PDF thất bại");
    }
  };

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
      alert("Tải PDF thất bại");
    }
  };

  const onGeneratePdf = async (id) => {
    try {
      await generatePdf(id);
      await load();
    } catch (err) {
      console.error(err);
      alert("Tạo PDF thất bại (hóa đơn phải ở trạng thái Đã thanh toán)");
    }
  };

  const onSendEmail = async (inv) => {
    if (!inv.email) {
      alert("Hóa đơn này chưa có email khách hàng.");
      return;
    }
    if (!inv.hasPdf) {
      alert("Hóa đơn chưa có PDF. Hãy tạo PDF trước.");
      return;
    }

    setSendingId(inv.id);
    try {
      await sendInvoiceEmail(inv.id);
      alert("Đã gửi email hóa đơn cho khách hàng.");
    } catch (err) {
      console.error(err);
      alert("Gửi email thất bại");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <StaffLayout>
      <div className="staff-page-header">
        <div className="d-block mb-2 mb-md-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item
              linkAs={Link}
              linkProps={{ to: "/staff/manager-dashboard" }}
            >
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item>Hóa đơn</Breadcrumb.Item>
            <Breadcrumb.Item active>Quản lý hóa đơn</Breadcrumb.Item>
          </Breadcrumb>
          <h4 className="staff-page-title">Quản lý hóa đơn</h4>
          <p className="staff-page-lead">
            Xem, lọc, tải và gửi hóa đơn điện tử cho khách
          </p>
        </div>
        <div className="btn-toolbar mb-2 mb-md-0" />
      </div>

      <div className="staff-panel">
        <Row className="justify-content-between align-items-center g-3">
          <Col xs={12} md={6} lg={5} xl={4}>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Tìm theo mã, khách hàng, email"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
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
                <Dropdown.Header>Hiển thị</Dropdown.Header>
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
                    {n} dòng
                    {pageSize === n && (
                      <span className="icon icon-small ms-auto">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                    )}
                  </Dropdown.Item>
                ))}

                <Dropdown.Divider />
                <Dropdown.Header>Sắp xếp</Dropdown.Header>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("created");
                    setSortDir("desc");
                    setPage(1);
                  }}
                >
                  Ngày tạo mới nhất
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("code");
                    setSortDir("asc");
                    setPage(1);
                  }}
                >
                  Mã hóa đơn A → Z
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("total");
                    setSortDir("desc");
                    setPage(1);
                  }}
                >
                  Tổng tiền cao xuống thấp
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("status");
                    setSortDir("asc");
                    setPage(1);
                  }}
                >
                  Trạng thái A → Z
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </div>

      <Card className="staff-panel table-responsive">
        <Card.Body className="pt-0">
          <div className="staff-table__summary">
            <div>Tổng số: {total}</div>
            {loading && (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />
                <span>Đang tải...</span>
              </div>
            )}
          </div>

          <Table hover className="align-items-center mb-0">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Khách hàng</th>
                <th>Email</th>
                <th>SĐT</th>
                <th className="text-end">Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((i) => {
                const hasPdf = Boolean(i.hasPdf);
                const canSend = Boolean(i.email && hasPdf);
                const isSending = sendingId === i.id;

                return (
                  <tr key={i.id}>
                    <td>{i.code}</td>
                    <td>{i.customer}</td>
                    <td>{i.email}</td>
                    <td>{i.phone}</td>
                    <td className="text-end">
                      {(i.total ?? 0).toLocaleString("vi-VN")} ₫
                    </td>
                    <td>{renderStatus(i.status)}</td>
                    <td>{formatDate(i.created)}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2"
                        title="Xem chi tiết"
                        onClick={() => openView(i.id)}
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Button>

                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        title="Tạo PDF"
                        onClick={() => onGeneratePdf(i.id)}
                        disabled={
                          String(i.status || "").toLowerCase() !== "paid" ||
                          hasPdf
                        }
                      >
                        <FontAwesomeIcon icon={faWandMagicSparkles} />
                      </Button>

                      {hasPdf && (
                        <>
                          <Button
                            variant="outline-dark"
                            size="sm"
                            className="me-2"
                            title="Xem PDF"
                            onClick={() => onPreviewPdf(i.id)}
                          >
                            <FontAwesomeIcon icon={faFilePdf} />
                          </Button>

                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="me-2"
                            title="Tải PDF"
                            onClick={() => onDownloadPdf(i.id, i.code)}
                          >
                            <FontAwesomeIcon icon={faDownload} />
                          </Button>

                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            title="Gửi email hóa đơn"
                            onClick={() => onSendEmail(i)}
                            disabled={!canSend || isSending}
                          >
                            {isSending ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FontAwesomeIcon icon={faPaperPlane} />
                            )}
                          </Button>

                        </>
                      )}

                      <Button
                        variant="outline-danger"
                        size="sm"
                        title="Xóa hóa đơn"
                        onClick={() => onDelete(i.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              Trang {page} / {totalPages}
            </div>

            {/* Pagination theo đúng UI bạn muốn: chỉ Trước | số trang | Sau */}
            <Pagination className="mb-0 staff-pagination">
              <Pagination.Item
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Pagination.Item>

              {renderPageItems(page, totalPages, (p) => setPage(p))}

              <Pagination.Item
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
              </Pagination.Item>
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
      items.push(<Pagination.Ellipsis key="e-ellipsis" disabled />);
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
