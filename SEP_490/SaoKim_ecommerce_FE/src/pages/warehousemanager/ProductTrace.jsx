import React, { useEffect, useMemo, useState } from "react";
import {
  Breadcrumb,
  ListGroup,
  Spinner,
  Badge,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
  faCircleInfo,
  faArrowDown,
  faArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import { useParams } from "react-router-dom";
import Select from "react-select";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { apiFetch } from "../../api/lib/apiClient";

const EVENT_TYPE_META = {
  import: {
    label: "Nhập kho",
    icon: faArrowDown,
    className: "wm-timeline__icon--import",
  },
  export: {
    label: "Xuất kho",
    icon: faArrowUp,
    className: "wm-timeline__icon--export",
  },
  other: {
    label: "Khác",
    icon: faCircleInfo,
    className: "wm-timeline__icon--other",
  },
};

function getEventMeta(typeRaw) {
  const t = (typeRaw || "").toLowerCase();
  if (EVENT_TYPE_META[t]) return EVENT_TYPE_META[t];
  return EVENT_TYPE_META.other;
}

export default function ProductTrace() {
  const { productId: routeProductId } = useParams();

  const [trace, setTrace] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [productOptions, setProductOptions] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductOption, setSelectedProductOption] = useState(null);

  const loadProductOptions = async (searchText = "") => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", 1);
      params.set("pageSize", 20);
      params.set("status", "all");
      if (searchText.trim()) {
        params.set("search", searchText.trim());
      }

      const res = await apiFetch(
        `/api/warehousemanager/inventory-report?${params.toString()}`
      );

      if (!res.ok) {
        console.error("Tải sản phẩm không thành công", res.status);
        return;
      }

      const data = await res.json();
      const items = data.items || [];

      const opts = items.map((x) => ({
        value: x.productId,
        label: `${x.productCode || "Không có mã"} • ${x.productName}`,
      }));
      setProductOptions(opts);
    } catch (e) {
      console.error("Lỗi tải danh sách sản phẩm cho truy xuất:", e);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchTrace = async (id) => {
    if (!id) return;

    setLoading(true);
    setError("");
    setTrace(null);
    setSelectedIndex(0);

    try {
      const res = await apiFetch(`/api/warehousemanager/trace/product/${id}`);
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const errBody = await res.json();
          if (errBody?.message) msg = errBody.message;
        } catch { }
        throw new Error(msg);
      }

      const data = await res.json();

      const movements = (data.movements || [])
        .map((m) => {
          const timeObj = new Date(m.date);
          const type =
            m.direction === "in"
              ? "import"
              : m.direction === "out"
                ? "export"
                : "other";

          return {
            ...m,
            type,
            timeObj,
            timeText: timeObj.toLocaleString("vi-VN", {
              hour12: false,
            }),
          };
        })
        .sort((a, b) => a.timeObj - b.timeObj);

      const newTrace = {
        ...data,
        movements,
      };

      setTrace(newTrace);
      setSelectedIndex(0);

      setSelectedProductOption({
        value: newTrace.productId,
        label: `${newTrace.productCode || "Chưa có SKU"} • ${newTrace.productName
          }`,
      });
    } catch (e) {
      console.error("Lỗi tải dữ liệu truy xuất:", e);
      setError(e.message || "Không tải được dữ liệu truy xuất.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductOptions("");
  }, []);

  useEffect(() => {
    if (routeProductId) {
      fetchTrace(routeProductId);
    }
  }, [routeProductId]);

  const summary = useMemo(() => {
    if (!trace || !trace.movements?.length) return null;

    const first = trace.movements[0];
    const last = trace.movements[trace.movements.length - 1];

    const totalIn = trace.movements
      .filter((m) => m.direction === "in")
      .reduce((sum, m) => sum + m.quantity, 0);

    const totalOut = trace.movements
      .filter((m) => m.direction === "out")
      .reduce((sum, m) => sum + m.quantity, 0);

    return {
      firstTime: first.timeText,
      lastTime: last.timeText,
      count: trace.movements.length,
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
    };
  }, [trace]);

  const selectedMovement =
    trace && trace.movements && trace.movements.length
      ? trace.movements[Math.min(selectedIndex, trace.movements.length - 1)]
      : null;

  const formatSlipType = (slipType) => {
    if (slipType === "receiving") return "Phiếu nhập kho";
    if (slipType === "sales") return "Phiếu xuất bán lẻ";
    if (slipType === "project") return "Phiếu xuất dự án";
    return "Phiếu khác";
  };

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
          <h1 className="wm-page-title">Truy xuất sản phẩm theo phiếu</h1>
          <p className="wm-page-subtitle">
            Xem lịch sử phiếu nhập và xuất của một sản phẩm: sản phẩm đã được
            nhập từ những phiếu nào và xuất ở những phiếu nào.
          </p>
        </div>
      </div>

      <div className="wm-surface wm-toolbar">
        <div
          className="wm-toolbar__search"
          style={{ maxWidth: 420, width: "100%" }}
        >
          <div className="d-flex align-items-center gap-2">
            <div className="wm-input-icon">
              <FontAwesomeIcon icon={faSearch} />
            </div>
            <div style={{ flex: 1 }}>
              <Select
                placeholder="Chọn sản phẩm để truy xuất..."
                classNamePrefix="wm-select"
                isClearable
                isSearchable
                value={selectedProductOption}
                options={productOptions}
                isLoading={productsLoading}
                onChange={(opt) => {
                  setSelectedProductOption(opt);
                  if (opt?.value) {
                    fetchTrace(opt.value);
                  } else {
                    setTrace(null);
                    setError("");
                  }
                }}
                onInputChange={(inputValue) => {
                  loadProductOptions(inputValue);
                  return inputValue;
                }}
              />
            </div>
          </div>
        </div>
        {error && <div className="text-danger small ms-3">{error}</div>}
      </div>

      <div className="wm-grid-two wm-grid-two--trace">
        <section className="wm-surface wm-trace-list-card">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="wm-section-title mb-0">Lịch sử phiếu</h2>
            <span className="wm-subtle-text">
              {loading
                ? "Đang tải..."
                : trace
                  ? `${trace.movements.length} phiếu`
                  : "Chưa chọn sản phẩm"}
            </span>
          </div>

          <ListGroup className="wm-trace-list">
            {loading ? (
              <div className="wm-empty p-3">
                <Spinner animation="border" size="sm" /> Đang tải dữ liệu...
              </div>
            ) : !trace ? (
              <div className="wm-empty p-3">
                Chọn một sản phẩm ở phía trên để xem lịch sử.
              </div>
            ) : trace.movements.length ? (
              trace.movements.map((m, idx) => {
                const meta = getEventMeta(m.type);
                const isActive = idx === selectedIndex;

                const slipTypeText = formatSlipType(m.slipType);

                return (
                  <ListGroup.Item
                    key={`${m.direction}-${m.slipType}-${m.refNo}-${idx}`}
                    action
                    active={isActive}
                    onClick={() => setSelectedIndex(idx)}
                    className="wm-trace-list__item"
                  >
                    <div className="wm-trace-list__row">
                      <div>
                        <div className="wm-trace-list__title">
                          {m.refNo} • {slipTypeText}
                        </div>
                        <div className="wm-subtle-text">
                          {meta.label} • {m.timeText}
                        </div>
                        <div className="small text-muted mt-1">
                          Đối tác : {m.partner || "-"} • Số lượng: {m.quantity}{" "}
                          {m.uom || ""}
                        </div>
                      </div>
                      <div className="text-end">
                        <Badge
                          bg={m.direction === "in" ? "success" : "danger"}
                          className="mb-1"
                        >
                          {m.direction === "in" ? "Nhập" : "Xuất"}
                        </Badge>
                        <div className="wm-subtle-text">
                          ID phiếu: {m.slipId}
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                );
              })
            ) : (
              <div className="wm-empty p-3">
                Sản phẩm chưa nằm trong phiếu nhập/xuất nào.
              </div>
            )}
          </ListGroup>
        </section>

        <section className="wm-surface wm-trace-detail-card">
          {trace ? (
            <>
              <header className="wm-trace-header">
                <div>
                  <span className="wm-tag">
                    ID: {trace.productId} • {trace.productCode || "Chưa có SKU"}
                  </span>
                  <h2 className="wm-section-title">{trace.productName}</h2>
                  <p className="wm-subtle-text mb-0">
                    Đơn vị tính: {trace.unit || "-"}
                  </p>
                  {summary && (
                    <div className="wm-trace-summary mt-2">
                      <div className="wm-trace-summary__line">
                        <span className="wm-trace-summary__label">Từ : </span>
                        <span className="wm-trace-summary__value">
                          {summary.firstTime
                            ? summary.firstTime.split(",")[0]
                            : "-"}
                        </span>

                        <span className="wm-trace-summary__label ms-3">Đến : </span>
                        <span className="wm-trace-summary__value">
                          {summary.lastTime
                            ? summary.lastTime.split(",")[0]
                            : "-"}
                        </span>
                      </div>

                      <div className="wm-trace-summary__line">
                        <span className="wm-trace-summary__label">Tổng số phiếu : </span>
                        <span className="wm-trace-summary__value">{summary.count}</span>

                        <span className="wm-trace-summary__label ms-3">Nhập : </span>
                        <span className="wm-trace-summary__value">{summary.totalIn}</span>

                        <span className="wm-trace-summary__label ms-3">Xuất : </span>
                        <span className="wm-trace-summary__value">{summary.totalOut}</span>
                      </div>

                      <div className="wm-trace-summary__line">
                        <span className="wm-trace-summary__label">Tồn theo phiếu : </span>
                        <span className="wm-trace-summary__value">{summary.balance}</span>
                      </div>
                    </div>
                  )}
                </div>
              </header>

              {selectedMovement ? (
                <div className="wm-trace-detail">
                  <div className="wm-trace-detail__header-row">
                    <div className="wm-trace-detail__main">
                      <div className="wm-trace-detail__badge-row">
                        <Badge
                          bg={selectedMovement.direction === "in" ? "success" : "danger"}
                        >
                          {selectedMovement.direction === "in" ? "Nhập kho" : "Xuất kho"}
                        </Badge>
                      </div>
                      <div className="wm-trace-detail__title">
                        <span className="ms-2 fw-semibold">
                          {formatSlipType(selectedMovement.slipType)}
                        </span>
                        {selectedMovement.refNo && (
                          <span className="ms-2 text-muted">
                            – Số phiếu: {selectedMovement.refNo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="wm-trace-detail__grid">
                    <div className="wm-trace-detail__item">
                      <span className="wm-trace-detail__label">Đối tác : </span>
                      <span className="wm-trace-detail__value">
                        {selectedMovement.partner || "-"}
                      </span>
                    </div>
                    <div className="wm-trace-detail__item">
                      <span className="wm-trace-detail__label">
                        Số lượng theo phiếu -
                      </span>
                      <span className="wm-trace-detail__value">
                        - {selectedMovement.quantity} {selectedMovement.uom || ""}
                      </span>
                    </div>
                    <div className="wm-trace-detail__item">
                      <span className="wm-trace-detail__label">Loại phiếu : </span>
                      <span className="wm-trace-detail__value">
                        {getEventMeta(selectedMovement.type).label}
                      </span>
                    </div>
                    <div className="wm-trace-detail__item wm-trace-detail__item--note">
                      <span className="wm-trace-detail__label">Ghi chú : </span>
                      <span className="wm-trace-detail__value">
                        {selectedMovement.note || "Không có ghi chú."}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="wm-empty mt-3">
                  Sản phẩm chưa có lịch sử phiếu nào.
                </div>
              )}
            </>
          ) : (
            <div className="wm-empty">
              Chọn sản phẩm ở thanh phía trên để xem chi tiết lịch sử phiếu.
            </div>
          )}
        </section>
      </div>
    </WarehouseLayout>
  );
}
