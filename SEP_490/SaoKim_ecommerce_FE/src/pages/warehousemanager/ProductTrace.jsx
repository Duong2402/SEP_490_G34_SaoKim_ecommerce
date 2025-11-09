import React, { useEffect, useMemo, useState } from "react";
import {
  Breadcrumb,
  Badge,
  Form,
  InputGroup,
  ListGroup,
  Spinner,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
  faArrowRight,
  faClock,
  faCircleInfo,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";

const API_BASE = "https://localhost:7278";

const STATUS_BADGE = {
  "Đang vận hành": "success",
  "Chờ lắp đặt": "info",
  "Đang bảo hành": "warning",
};

export default function ProductTrace() {
  const [records, setRecords] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRecords = async (keyword = "") => {
    setLoading(true);
    try {
      const qs = keyword ? `?query=${encodeURIComponent(keyword)}` : "";
      const res = await fetch(`${API_BASE}/api/warehousemanager/trace${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const mapped = (data || []).map((r) => ({
        ...r,
        timeline: (r.timeline || []).map((t) => ({
          ...t,
          time: new Date(t.time).toLocaleString("vi-VN", { hour12: false }),
        })),
      }));

      setRecords(mapped);
      setSelectedId((prev) => prev ?? (mapped[0]?.id ?? null));
    } catch (e) {
      console.error(e);
      setRecords([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  // load lần đầu
  useEffect(() => {
    fetchRecords("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce 300ms khi search
  useEffect(() => {
    const h = setTimeout(() => fetchRecords(query.trim()), 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filteredRecords = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return records;
    return records.filter(
      (r) =>
        (r.serial || "").toLowerCase().includes(kw) ||
        (r.sku || "").toLowerCase().includes(kw) ||
        (r.productName || "").toLowerCase().includes(kw) ||
        (r.project || "").toLowerCase().includes(kw)
    );
  }, [records, query]);

  // giữ selectedId hợp lệ
  useEffect(() => {
    if (!filteredRecords.length) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!filteredRecords.some((r) => r.id === selectedId)) {
      setSelectedId(filteredRecords[0].id);
    }
  }, [filteredRecords, selectedId]);

  const selectedRecord =
    filteredRecords.find((r) => r.id === selectedId) ?? null;

  return (
    <WarehouseLayout>
      <div className="wm-page-header">
        <div>
          <div className="wm-breadcrumb">
            <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
              <Breadcrumb.Item href="/warehouse-dashboard">
                <FontAwesomeIcon icon={faHome} /> Bảng điều phối
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Truy xuất sản phẩm</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Truy xuất sản phẩm</h1>
          <p className="wm-page-subtitle">
            Kiểm tra lộ trình di chuyển của sản phẩm theo số serial hoặc lô sản xuất để kiểm soát chất lượng.
          </p>
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
              placeholder="Nhập serial, mã lô, SKU hoặc dự án liên quan..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      <div className="wm-grid-two">
        <section className="wm-surface">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="wm-section-title mb-0">Danh sách kết quả</h2>
            <span className="wm-subtle-text">
              {loading ? "Đang tải..." : `${filteredRecords.length} kết quả`}
            </span>
          </div>

          <ListGroup className="wm-trace-list">
            {loading ? (
              <div className="wm-empty p-3">
                <Spinner animation="border" size="sm" /> Đang tải dữ liệu...
              </div>
            ) : filteredRecords.length ? (
              filteredRecords.map((record) => (
                <ListGroup.Item
                  key={record.id}
                  action
                  active={selectedRecord?.id === record.id}
                  onClick={() => setSelectedId(record.id)}
                >
                  <div className="wm-trace-list__row">
                    <div>
                      <div className="wm-trace-list__title">{record.serial}</div>
                      <div className="wm-subtle-text">
                        {record.sku} • {record.productName}
                      </div>
                    </div>
                    <div className="text-end">
                      <Badge
                        bg={STATUS_BADGE[record.status] ?? "secondary"}
                        className="mb-1"
                      >
                        {record.status ?? "Không xác định"}
                      </Badge>
                      <div className="wm-subtle-text">
                        {record.project || "-"}
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))
            ) : (
              <div className="wm-empty p-3">Không có kết quả phù hợp.</div>
            )}
          </ListGroup>
        </section>

        <section className="wm-surface">
          {selectedRecord ? (
            <>
              <header className="wm-trace-header">
                <div>
                  <span className="wm-tag">{selectedRecord.serial}</span>
                  <h2 className="wm-section-title">
                    {selectedRecord.productName}
                  </h2>
                  <p className="wm-subtle-text mb-0">
                    SKU: {selectedRecord.sku} • Dự án:{" "}
                    {selectedRecord.project || "-"}
                  </p>
                </div>
                <Badge
                  bg={STATUS_BADGE[selectedRecord.status] ?? "primary"}
                >
                  {selectedRecord.status ?? "Không xác định"}
                </Badge>
              </header>

              <div className="wm-trace-meta">
                <div>
                  <FontAwesomeIcon icon={faLocationDot} />
                  <div>
                    <span>Vị trí hiện tại</span>
                    <strong>{selectedRecord.currentLocation || "-"}</strong>
                  </div>
                </div>
                <div>
                  <FontAwesomeIcon icon={faCircleInfo} />
                  <div>
                    <span>Dự án/Khách hàng</span>
                    <strong>{selectedRecord.project || "-"}</strong>
                  </div>
                </div>
              </div>

              <div className="wm-timeline">
                {(selectedRecord.timeline || []).map((item, idx) => (
                  <div key={`${item.ref || "ref"}-${idx}`} className="wm-timeline__item">
                    <div className={`wm-timeline__icon wm-timeline__icon--${item.type || "import"}`} />
                    <div className="wm-timeline__body">
                      <div className="wm-timeline__time">
                        <FontAwesomeIcon icon={faClock} />
                        {item.time}
                      </div>
                      <div className="wm-timeline__title">
                        <FontAwesomeIcon icon={faArrowRight} />
                        {item.ref || "-"}
                      </div>
                      <div className="wm-timeline__meta">
                        <span>{item.actor || "-"}</span>
                        <span>{item.note || "-"}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!selectedRecord.timeline ||
                  selectedRecord.timeline.length === 0) && (
                  <div className="wm-empty">Chưa có sự kiện nào.</div>
                )}
              </div>
            </>
          ) : (
            <div className="wm-empty">
              Chọn một bản ghi ở danh sách bên trái để xem chi tiết.
            </div>
          )}
        </section>
      </div>
    </WarehouseLayout>
  );
}
