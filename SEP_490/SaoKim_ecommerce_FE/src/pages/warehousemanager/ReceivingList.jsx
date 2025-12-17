import React, { useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
  faEye,
  faCheck,
  faTrash,
  faFileImport,
  faPlus,
  faDownload,
  faFileExport,
} from "@fortawesome/free-solid-svg-icons";
import {
  Breadcrumb,
  Form,
  InputGroup,
  Badge,
  Button,
} from "@themesberg/react-bootstrap";
import { Modal, Spinner, Toast, ToastContainer } from "react-bootstrap";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { apiFetch } from "../../api/lib/apiClient";
import { ensureRealtimeStarted, getRealtimeConnection } from "../../signalr/realtimeHub";
import { useNavigate, useSearchParams } from "react-router-dom";

const toStatusCode = (v) => {
  if (v === 1 || v === "1") return 1;
  if (v === 0 || v === "0") return 0;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s.includes("confirm")) return 1;
    if (s.includes("draft")) return 0;
  }
  return 0;
};

const truncateText = (text, maxLength = 40) => {
  if (!text) return "";
  const str = String(text);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
};

export default function ReceivingList() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(() => sp.get("search") || "");
  const [pageSize] = useState(10);
  const [page, setPage] = useState(() => Number(sp.get("page") || 1));
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [sortBy, setSortBy] = useState(() => sp.get("sortBy") || "receiptDate");
  const [sortOrder, setSortOrder] = useState(() => sp.get("sortOrder") || "desc");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [notify, setNotify] = useState(null);

  const loadData = useCallback(
    async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("pageSize", pageSize);
        if (search) params.append("search", search);
        if (sortBy) params.append("sortBy", sortBy);
        if (sortOrder) params.append("sortOrder", sortOrder);

        const res = await apiFetch(
          `/api/warehousemanager/receiving-slips?${params.toString()}`
        );
        const data = await res.json();

        setRows(data.items || []);
        setTotal(data.totalItems || data.total || 0);
      } catch (error) {
        console.error("Lỗi khi tải danh sách phiếu nhập:", error);
        setNotify("Lỗi khi tải danh sách phiếu nhập.");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, search, sortBy, sortOrder]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const conn = getRealtimeConnection();

    conn.off("evt");

    conn.on("evt", (payload) => {
      const type = payload?.type;
      if (!type) return;

      switch (type) {
        case "receiving.created":
        case "receiving.deleted":
        case "receiving.updated":
        case "receiving.confirmed":
        case "receiving.imported":
          loadData();
          break;
        default:
          break;
      }
    });

    ensureRealtimeStarted().catch(() => {
      setNotify("Không thể kết nối realtime tới máy chủ.");
    });

    return () => {
      conn.off("evt");
    };
  }, [loadData]);

  useEffect(() => {
    if (notify) {
      const t = setTimeout(() => setNotify(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notify]);

  const handleConfirm = async (id) => {
    try {
      const res = await apiFetch(
        `/api/warehousemanager/receiving-slips/${id}/confirm`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Xác nhận thất bại");
      }

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 1, confirmedAt: new Date().toISOString() }
            : r
        )
      );

      setNotify("Xác nhận thành công.");
    } catch (error) {
      console.error("Xác nhận thất bại:", error);
      setNotify(error.message || "Không thể xác nhận phiếu.");
    }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  async function handleExportSelected(includeItems = true) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      const confirmAll = window.confirm(
        "Bạn chưa chọn phiếu nào. Bạn có muốn xuất TẤT CẢ phiếu đang hiển thị theo bộ lọc hiện tại?"
      );
      if (!confirmAll) return;
      const allIds = rows.map((r) => r.id);
      if (allIds.length === 0) {
        setNotify("Không có dữ liệu để xuất.");
        return;
      }
      await exportByIds(allIds, includeItems);
      return;
    }
    await exportByIds(ids, includeItems);
  }

  async function exportByIds(ids, includeItems) {
    try {
      const res = await apiFetch(
        `/api/warehousemanager/receiving-slips/export-selected`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, includeItems }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Xuất file thất bại");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receiving-slips-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotify("Xuất file thành công.");
    } catch (e) {
      console.error(e);
      setNotify(e.message || "Xuất file thất bại.");
    }
  }

  const handleDeleteToTrash = async (id) => {
    if (!window.confirm("Bạn có chắc muốn đưa phiếu này vào thùng rác?")) return;

    try {
      const res = await apiFetch(
        `/api/warehousemanager/receiving-slips/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Xóa thất bại");
      }

      setRows((prev) => prev.filter((r) => r.id !== id));

      setNotify("Phiếu đã bị xóa.");
    } catch (error) {
      console.error(error);
      setNotify(error.message || "Không thể xóa phiếu.");
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setNotify("Vui lòng chọn file Excel trước.");
      return;
    }

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await apiFetch(
        `/api/warehousemanager/receiving-slips/import`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json().catch(() => ({}));
      setNotify(data.message || "Tải phiếu thành công.");
      setShowImportModal(false);
      setImportFile(null);
      loadData();
    } catch (e) {
      console.error(e);
      setNotify(e.message || "Tải phiếu thất bại.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const selectAllCurrentPage = () => {
    setSelectedIds(new Set(rows.map((r) => r.id)));
  };

  const formatDate = (v) =>
    v ? new Date(v).toLocaleDateString("vi-VN") : "-";

  return (
    <WarehouseLayout>
      <div className="wm-page-header">
        <div>
          <div className="wm-breadcrumb">
            <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
              <Breadcrumb.Item href="/warehouse-dashboard">
                <FontAwesomeIcon icon={faHome} /> Quản lý kho
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Phiếu nhập kho</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Quản lý phiếu nhập kho</h1>
          <p className="wm-page-subtitle">
            Kiểm soát luồng hàng vào kho, xác nhận phiếu và theo dõi tiến độ
            tiếp nhận.
          </p>
        </div>

        <div className="wm-page-actions">
          <button
            type="button"
            className="wm-btn wm-btn--light"
            onClick={() => {
              window.open(
                `/api/warehousemanager/download-template`,
                "_blank"
              );
            }}
          >
            <FontAwesomeIcon icon={faDownload} /> Tải mẫu phiếu nhập
          </button>

          <button
            type="button"
            className="wm-btn"
            onClick={() => setShowImportModal(true)}
          >
            <FontAwesomeIcon icon={faFileImport} /> Nhập từ phiếu
          </button>

          <button
            type="button"
            className="wm-btn wm-btn--light"
            onClick={selectAllCurrentPage}
          >
            Chọn tất cả kết quả
          </button>
          <button
            type="button"
            className="wm-btn wm-btn--light"
            onClick={clearSelection}
          >
            Bỏ chọn
          </button>

          <button
            type="button"
            className="wm-btn"
            onClick={() => handleExportSelected(true)}
          >
            <FontAwesomeIcon icon={faFileExport} /> Xuất phiếu
          </button>

          <button
            type="button"
            className="wm-btn wm-btn--primary"
            onClick={() =>
              navigate("/warehouse-dashboard/receiving-slips/create")
            }
          >
            <FontAwesomeIcon icon={faPlus} /> Tạo phiếu mới
          </button>
        </div>
      </div>

      <Modal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Nhập phiếu từ file Excel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Button
            variant="link"
            className="mb-3 p-0"
            onClick={() =>
              window.open(
                `/api/warehousemanager/download-template`,
                "_blank"
              )
            }
          >
            <FontAwesomeIcon icon={faDownload} /> Tải mẫu phiếu nhập
          </Button>

          <input
            type="file"
            accept=".xlsx,.xls"
            className="form-control"
            onChange={(e) => setImportFile(e.target.files[0])}
          />
          <small className="text-muted d-block mt-2">
            File cần gồm: Supplier, ReceiptDate, Note, ProductName, Uom,
            Quantity, UnitPrice
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowImportModal(false)}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={importLoading}
          >
            {importLoading ? (
              <>
                <Spinner animation="border" size="sm" /> Đang nhập...
              </>
            ) : (
              "Xác nhận import"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="wm-surface wm-toolbar">
        <div className="wm-toolbar__search">
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faSearch} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Tìm theo mã phiếu hoặc nhà cung cấp..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </InputGroup>
        </div>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>
                <Form.Check
                  type="checkbox"
                  checked={
                    rows.length > 0 &&
                    rows.every((r) => selectedIds.has(r.id))
                  }
                  onChange={() => {
                    const pageIds = rows.map((r) => r.id);
                    const allSelected = pageIds.every((id) =>
                      selectedIds.has(id)
                    );
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (allSelected) {
                        pageIds.forEach((id) => next.delete(id));
                      } else {
                        pageIds.forEach((id) => next.add(id));
                      }
                      return next;
                    });
                  }}
                />
              </th>
              <th>#</th>
              <th role="button" onClick={() => handleSort("referenceNo")}>
                Mã phiếu
              </th>
              <th role="button" onClick={() => handleSort("supplier")}>
                Nhà cung cấp
              </th>
              <th role="button" onClick={() => handleSort("receiptDate")}>
                Ngày nhận
              </th>
              <th role="button" onClick={() => handleSort("status")}>
                Trạng thái
              </th>
              <th role="button" onClick={() => handleSort("createdAt")}>
                Ngày tạo
              </th>
              <th role="button" onClick={() => handleSort("confirmedAt")}>
                Ngày xác nhận
              </th>
              <th role="button" onClick={() => handleSort("note")}>
                Ghi chú
              </th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="wm-empty">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="wm-empty">
                  Không tìm thấy phiếu phù hợp.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const code = toStatusCode(r.status);
                const isConfirmed = code === 1;
                const checked = selectedIds.has(r.id);
                const supplierText = r.supplier || "";
                const noteText = r.note || "Không có ghi chú";

                return (
                  <tr key={r.id}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(r.id)}
                      />
                    </td>
                    <td>{(page - 1) * pageSize + idx + 1}</td>
                    <td>{r.referenceNo}</td>
                    <td>
                      <span title={supplierText}>
                        {truncateText(supplierText, 40) || "-"}
                      </span>
                    </td>
                    <td>{formatDate(r.receiptDate)}</td>
                    <td>
                      {isConfirmed ? (
                        <Badge bg="success">Đã xác nhận</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">
                          Nháp
                        </Badge>
                      )}
                    </td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      {r.confirmedAt
                        ? formatDate(r.confirmedAt)
                        : "Chưa xác nhận"}
                    </td>
                    <td>
                      <span title={noteText}>
                        {truncateText(noteText, 60)}
                      </span>
                    </td>
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() =>
                          navigate(
                            `/warehouse-dashboard/receiving-slips/${r.id}/items`,
                            { state: { fromList: true } }
                          )
                        }
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Button>
                      {!isConfirmed && (
                        <>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleConfirm(r.id)}
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteToTrash(r.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>
          Tổng: {total} phiếu • Trang {page}/{totalPages}
        </div>

        <div className="btn-group">
          <button
            className="btn btn-outline-secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) =>
                Math.abs(p - page) <= 2 || p === 1 || p === totalPages
            )
            .reduce((acc, p, idx, arr) => {
              if (idx && p - arr[idx - 1] > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <button
                  key={`gap-${i}`}
                  className="btn btn-outline-light"
                  disabled
                >
                  ...
                </button>
              ) : (
                <button
                  key={p}
                  className={`btn ${p === page ? "btn-primary" : "btn-outline-secondary"
                    }`}
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p}
                </button>
              )
            )}

          <button
            className="btn btn-outline-secondary"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau
          </button>
        </div>
      </div>

      {notify && (
        <ToastContainer
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
          }}
        >
          <Toast
            onClose={() => setNotify(null)}
            show={!!notify}
            delay={3500}
            autohide
            bg="warning"
          >
            <Toast.Header closeButton>
              <strong className="me-auto">Thông báo</strong>
            </Toast.Header>
            <Toast.Body>{notify}</Toast.Body>
          </Toast>
        </ToastContainer>
      )}
    </WarehouseLayout>
  );
}
