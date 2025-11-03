import React, { useMemo, useState } from "react";
import { Breadcrumb, Badge, Form, InputGroup, Dropdown } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
  faSliders,
  faLayerGroup,
  faPlus,
  faBell,
  faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";

const MOCK_STOCK = [
  {
    id: 1,
    sku: "SKU-LGT-001",
    name: "Đèn LED Panel 600x600",
    category: "Đèn trần",
    quantity: 420,
    uom: "pcs",
    location: "Khu A - Kệ 03",
    status: "stock",
    warning: "Ổn định",
    minStock: 200,
  },
  {
    id: 2,
    sku: "SKU-LGT-018",
    name: "Bộ điều khiển thông minh",
    category: "Thiết bị điều khiển",
    quantity: 48,
    uom: "pcs",
    location: "Khu B - Kệ 07",
    status: "alert",
    warning: "Dưới định mức",
    minStock: 80,
  },
  {
    id: 3,
    sku: "SKU-LGT-112",
    name: "Đèn đường năng lượng mặt trời",
    category: "Đèn ngoài trời",
    quantity: 132,
    uom: "pcs",
    location: "Sân sau - Pallet 12",
    status: "stock",
    warning: "Cần kiểm đếm",
    minStock: 100,
  },
  {
    id: 4,
    sku: "SKU-LGT-201",
    name: "Đèn spotlight cao cấp",
    category: "Đèn trang trí",
    quantity: 18,
    uom: "pcs",
    location: "Khu C - Tủ 02",
    status: "critical",
    warning: "Chờ nhập bổ sung",
    minStock: 60,
  },
  {
    id: 5,
    sku: "SKU-LGT-320",
    name: "Bộ phụ kiện thi công",
    category: "Phụ kiện",
    quantity: 295,
    uom: "bộ",
    location: "Khu A - Kệ 01",
    status: "stock",
    warning: "Ổn định",
    minStock: 120,
  },
];

const LOCATIONS = ["Tất cả vị trí", "Khu A", "Khu B", "Khu C", "Sân sau"];
const STATUSES = [
  { key: "all", label: "Tất cả trạng thái" },
  { key: "stock", label: "Đủ hàng" },
  { key: "alert", label: "Cần theo dõi" },
  { key: "critical", label: "Thiếu hàng" },
];

const WarehouseInventory = () => {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("Tất cả vị trí");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredStock = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return MOCK_STOCK.filter((item) => {
      const matchKeyword =
        !keyword ||
        item.sku.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword);

      const matchLocation =
        locationFilter === "Tất cả vị trí" || item.location.toLowerCase().includes(locationFilter.toLowerCase());

      const matchStatus = statusFilter === "all" || item.status === statusFilter;

      return matchKeyword && matchLocation && matchStatus;
    });
  }, [locationFilter, search, statusFilter]);

  const summary = useMemo(() => {
    const totalSku = MOCK_STOCK.length;
    const totalStock = MOCK_STOCK.reduce((acc, item) => acc + item.quantity, 0);
    const lowStock = MOCK_STOCK.filter((item) => item.quantity < item.minStock).length;
    const critical = MOCK_STOCK.filter((item) => item.status === "critical").length;
    return { totalSku, totalStock, lowStock, critical };
  }, []);

  const renderStatus = (status) => {
    switch (status) {
      case "stock":
        return <Badge bg="success">Đủ hàng</Badge>;
      case "alert":
        return <Badge bg="warning" text="dark">Cần theo dõi</Badge>;
      case "critical":
        return <Badge bg="danger">Thiếu hàng</Badge>;
      default:
        return <Badge bg="secondary">Không xác định</Badge>;
    }
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
              <Breadcrumb.Item active>Quản lý tồn kho</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Quản lý tồn kho</h1>
          <p className="wm-page-subtitle">
            Theo dõi lượng tồn theo vị trí lưu trữ, cảnh báo định mức và lập kế hoạch bổ sung hàng hóa.
          </p>
        </div>

        <div className="wm-page-actions">
          <button type="button" className="wm-btn wm-btn--light">
            <FontAwesomeIcon icon={faSliders} />
            Thiết lập định mức
          </button>
          <button type="button" className="wm-btn">
            <FontAwesomeIcon icon={faLayerGroup} />
            Sơ đồ kho
          </button>
          <button type="button" className="wm-btn wm-btn--primary">
            <FontAwesomeIcon icon={faPlus} />
            Tạo phiếu kiểm kê
          </button>
        </div>
      </div>

      <div className="wm-stat-grid">
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faBoxesStacked} />
          </div>
          <span className="wm-stat-card__label">SKU đang quản lý</span>
          <span className="wm-stat-card__value">{summary.totalSku}</span>
          <span className="wm-stat-card__meta">Theo danh mục thành phẩm</span>
        </div>
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faLayerGroup} />
          </div>
          <span className="wm-stat-card__label">Tồn kho hiện tại</span>
          <span className="wm-stat-card__value">{summary.totalStock}</span>
          <span className="wm-stat-card__meta">Tính theo đơn vị lưu kho</span>
        </div>
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faBell} />
          </div>
          <span className="wm-stat-card__label">SKU dưới định mức</span>
          <span className="wm-stat-card__value">{summary.lowStock}</span>
          <span className="wm-stat-card__meta">Cần nhập bổ sung</span>
        </div>
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faSearch} />
          </div>
          <span className="wm-stat-card__label">Cảnh báo ưu tiên</span>
          <span className="wm-stat-card__value">{summary.critical}</span>
          <span className="wm-stat-card__meta">Mức thiếu hàng nghiêm trọng</span>
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
              placeholder="Tìm theo SKU, tên sản phẩm hoặc danh mục..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
        </div>

        <div className="wm-toolbar__actions">
          <Dropdown>
            <Dropdown.Toggle variant="link" className="wm-btn wm-btn--light">
              {locationFilter}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              {LOCATIONS.map((location) => (
                <Dropdown.Item
                  key={location}
                  active={locationFilter === location}
                  onClick={() => setLocationFilter(location)}
                >
                  {location}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          <Dropdown>
            <Dropdown.Toggle variant="link" className="wm-btn wm-btn--light">
              {
                STATUSES.find((status) => status.key === statusFilter)?.label ??
                STATUSES[0].label
              }
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              {STATUSES.map((status) => (
                <Dropdown.Item
                  key={status.key}
                  active={statusFilter === status.key}
                  onClick={() => setStatusFilter(status.key)}
                >
                  {status.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Tồn kho</th>
              <th>Vị trí lưu trữ</th>
              <th>Định mức tối thiểu</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.length > 0 ? (
              filteredStock.map((item) => (
                <tr key={item.id}>
                  <td className="fw-semibold">{item.sku}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>
                    {item.quantity} {item.uom}
                  </td>
                  <td>{item.location}</td>
                  <td>{item.minStock}</td>
                  <td>{renderStatus(item.status)}</td>
                  <td>{item.warning}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="wm-empty">
                  Không có sản phẩm phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="wm-grid-two">
        <section className="wm-surface">
          <h2 className="wm-section-title mb-3">Tình trạng khu vực kho</h2>
          <div className="wm-location-grid">
            {[
              { name: "Khu A", capacity: "84%", free: "16%", status: "Hoạt động ổn định" },
              { name: "Khu B", capacity: "62%", free: "38%", status: "Có thể bổ sung" },
              { name: "Khu C", capacity: "45%", free: "55%", status: "Sẵn sàng tiếp nhận" },
            ].map((location) => (
              <div key={location.name} className="wm-location-card">
                <header>
                  <strong>{location.name}</strong>
                  <span>{location.status}</span>
                </header>
                <div className="wm-location-card__metrics">
                  <div>
                    <span>Đã sử dụng</span>
                    <strong>{location.capacity}</strong>
                  </div>
                  <div>
                    <span>Còn trống</span>
                    <strong>{location.free}</strong>
                  </div>
                </div>
                <div className="wm-location-card__bar">
                  <div style={{ width: location.capacity }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="wm-surface">
          <h2 className="wm-section-title mb-3">Cảnh báo cần xử lý</h2>
          <ul className="wm-alert-list">
            {[
              {
                badge: "SKU-LGT-201",
                title: "Thiếu hàng Spotlight",
                detail: "Lập kế hoạch nhập 50 pcs trước 20/11 để kịp dự án Sao Kim Tower.",
              },
              {
                badge: "Kệ B07",
                title: "Bố trí lại phụ kiện",
                detail: "Đề xuất chuyển sang Khu C để giảm áp lực tồn kho khu B.",
              },
              {
                badge: "Kiểm kê",
                title: "Đến hạn kiểm kê định kỳ",
                detail: "Lên kế hoạch kiểm kê toàn bộ Khu A tuần thứ 3 của tháng.",
              },
            ].map((alert, index) => (
              <li key={alert.title} className="wm-alert-item">
                <span className="wm-alert-item__badge">{index + 1}</span>
                <div className="wm-alert-item__content">
                  <h6>{alert.title}</h6>
                  <p>{alert.detail}</p>
                  <span className="wm-tag">{alert.badge}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </WarehouseLayout>
  );
};

export default WarehouseInventory;

