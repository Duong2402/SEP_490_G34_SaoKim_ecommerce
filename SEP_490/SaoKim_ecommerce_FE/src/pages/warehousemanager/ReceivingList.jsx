import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
  faCog,
  faEye,
  faCheck,
  faTrash,
  faCloudArrowDown,
  faFileImport,
  faFileExport,
} from "@fortawesome/free-solid-svg-icons";
import {
  Breadcrumb,
  Form,
  InputGroup,
  Dropdown,
  Badge,
  Button,
} from "@themesberg/react-bootstrap";
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
  const [pageSize, setPageSize] = useState(10);

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
      if (!res.ok) {
        throw new Error("Confirm failed");
      }

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
              ...r,
              status: 1, // sau confirm, chuẩn về code 1
              confirmedAt: new Date().toISOString(),
            }
            : r
        )
      );
    } catch (error) {
      console.error("Confirm failed:", error);
      alert("Không thể xác nhận phiếu. Vui lòng thử lại.");
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

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "-");

  return (
    <WarehouseLayout>
      <div className="wm-page-header">
        <div>
          <div className="wm-breadcrumb">
            <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
              <Breadcrumb.Item href="/warehouse-dashboard">
                <FontAwesomeIcon icon={faHome} /> Bảng điều phối
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
            <FontAwesomeIcon icon={faCloudArrowDown} />
            Tải mẫu Excel
          </button>
          <button type="button" className="wm-btn">
            <FontAwesomeIcon icon={faFileImport} />
            Nhập danh sách
          </button>
          <button type="button" className="wm-btn wm-btn--primary">
            <FontAwesomeIcon icon={faFileExport} />
            Xuất báo cáo
          </button>
        </div>
      </div>

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
              <th>Mã phiếu</th>
              <th>Nhà cung cấp</th>
              <th>Ngày nhận</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Ngày xác nhận</th>
              <th>Ghi chú</th>
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
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="wm-empty">
                  Không tìm thấy phiếu phù hợp.
                </td>
              </tr>
            ) : (
              filteredRows.slice(0, pageSize).map((r) => {
                const code = toStatusCode(r.status);
                const isConfirmed = code === 1;

                return (
                  <tr key={r.id}>
                    <td>{r.id}</td>
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
                    <td>{formatDate(r.confirmedAt)}</td>
                    <td>{r.note || "-"}</td>

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
                          <Button variant="outline-danger" size="sm">
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
