import React, { useEffect, useMemo, useState } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import {
  Breadcrumb,
  Form,
  InputGroup,
  Badge,
  Button,
} from "@themesberg/react-bootstrap";
import { Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import WarehouseLayout from "../../layouts/WarehouseLayout";

const API_BASE = "https://localhost:7278";

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

export default function ReceivingList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize] = useState(10);
  const [sortBy, setSortBy] = useState("receiptDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips`);
        const data = await res.json();
        setRows(data.items || []);
      } catch (error) {
        console.error("Error loading receiving slips:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleConfirm = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Confirm failed");

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: 1, confirmedAt: new Date().toISOString() }
            : r
        )
      );
    } catch (error) {
      console.error("Confirm failed:", error);
      alert("Không thể xác nhận phiếu. Vui lòng thử lại.");
    }
  };

  const handleDeleteToTrash = async (id) => {
    if (!window.confirm("Bạn có chắc muốn đưa phiếu này vào thùng rác?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Xóa thất bại");
      }

      setRows(prev => prev.filter(r => r.id !== id));

      alert("Phiếu đã bị xóa!");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert("Vui lòng chọn file Excel trước!");
      return;
    }

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Import thành công!");
        setShowImportModal(false);
        setImportFile(null);

        const reload = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips`);
        const reloadData = await reload.json();
        setRows(reloadData.items || []);
      } else {
        alert(data.message || "Import thất bại!");
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert("Có lỗi khi import file.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const keyword = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.referenceNo?.toLowerCase().includes(keyword) ||
        r.supplier?.toLowerCase().includes(keyword)
    );
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy.includes("Date")) {
        valA = new Date(valA);
        valB = new Date(valB);
      }
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRows, sortBy, sortOrder]);

  const formatDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "-");

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
            Kiểm soát luồng hàng vào kho, xác nhận phiếu và theo dõi tiến độ tiếp nhận.
          </p>
        </div>

        <div className="wm-page-actions">
          <button
            type="button"
            className="wm-btn wm-btn--light"
            onClick={() => {
              window.open(`${API_BASE}/api/warehousemanager/download-template`, "_blank");
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
            className="wm-btn wm-btn--primary"
            onClick={() => navigate("/warehouse-dashboard/receiving-slips/create")}
          >
            <FontAwesomeIcon icon={faPlus} /> Tạo phiếu mới
          </button>
        </div>
      </div>

      {/* === Modal Import === */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Nhập phiếu từ file Excel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Button
            variant="link"
            className="mb-3 p-0"
            onClick={() =>
              window.open(`${API_BASE}/api/warehousemanager/download-template`, "_blank")
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
            File cần gồm: Supplier, ReceiptDate, Note, ProductName, Uom, Quantity, UnitPrice
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
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
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
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
                Ghi chú</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="wm-empty">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="wm-empty">
                  Không tìm thấy phiếu phù hợp.
                </td>
              </tr>
            ) : (
              sortedRows.slice(0, pageSize).map((r, idx) => {
                const code = toStatusCode(r.status);
                const isConfirmed = code === 1;
                return (
                  <tr key={r.id}>
                    <td>{idx + 1}</td>
                    <td>{r.referenceNo}</td>
                    <td>{r.supplier}</td>
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
                    <td>{r.confirmedAt ? formatDate(r.confirmedAt) : "Chưa xác nhận"}</td>
                    <td>{r.note || "N/A"}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() =>
                          navigate(`/warehouse-dashboard/receiving-slips/${r.id}/items`)
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
    </WarehouseLayout>
  );
}
