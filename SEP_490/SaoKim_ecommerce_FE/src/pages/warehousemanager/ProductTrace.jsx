import React, { useMemo, useState } from "react";
import { Breadcrumb, Badge, Form, InputGroup, ListGroup } from "@themesberg/react-bootstrap";
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

const TRACE_RECORDS = [
  {
    id: 1,
    serial: "SN-2300112",
    sku: "SKU-LGT-112",
    productName: "Đèn đường năng lượng mặt trời",
    status: "Đang vận hành",
    project: "Dự án Sao Kim Solar",
    currentLocation: "Công trình QL18 - Km12",
    timeline: [
      {
        time: "10/10/2025 • 08:20",
        type: "import",
        ref: "PNK-2401",
        actor: "Kho tiếp nhận",
        note: "Tiếp nhận 120 bộ từ nhà cung cấp SkyLight.",
      },
      {
        time: "14/10/2025 • 14:45",
        type: "qa",
        ref: "QA-1132",
        actor: "Phòng QC",
        note: "Kiểm tra chất lượng, đạt chuẩn ISO 9001.",
      },
      {
        time: "18/10/2025 • 09:05",
        type: "dispatch",
        ref: "PXK-3398",
        actor: "Kho trung tâm",
        note: "Xuất giao cho dự án Sao Kim Solar, xe tải 43C-112.45.",
      },
      {
        time: "19/10/2025 • 16:30",
        type: "install",
        ref: "SITE-LOG",
        actor: "Đội thi công",
        note: "Lắp đặt tại tuyến đường số 5, khu vực A.",
      },
    ],
  },
  {
    id: 2,
    serial: "LOT-2025-0902",
    sku: "SKU-LGT-201",
    productName: "Đèn spotlight cao cấp",
    status: "Chờ lắp đặt",
    project: "Showroom Sao Kim",
    currentLocation: "Kho Khu C - Tủ 02",
    timeline: [
      {
        time: "08/09/2025 • 10:12",
        type: "import",
        ref: "PNK-2388",
        actor: "Kho trung chuyển",
        note: "Nhập 60 bộ từ nhà máy Sao Kim.",
      },
      {
        time: "08/09/2025 • 15:40",
        type: "qa",
        ref: "QA-1110",
        actor: "Phòng QC",
        note: "Kiểm định ngoại quan, 2 bộ cần kiểm tra lại.",
      },
      {
        time: "20/09/2025 • 11:05",
        type: "warehouse",
        ref: "INV-CYCLE",
        actor: "Kho thành phẩm",
        note: "Kiểm kê định kỳ, tồn thực tế 58 bộ.",
      },
    ],
  },
  {
    id: 3,
    serial: "SN-2400338",
    sku: "SKU-LGT-018",
    productName: "Bộ điều khiển thông minh",
    status: "Đang bảo hành",
    project: "Khách hàng lẻ",
    currentLocation: "Trung tâm bảo hành Đà Nẵng",
    timeline: [
      {
        time: "02/07/2025 • 09:10",
        type: "dispatch",
        ref: "PXK-3110",
        actor: "Kho bán hàng",
        note: "Xuất bán cho đại lý Sao Kim Đà Nẵng.",
      },
      {
        time: "12/10/2025 • 09:55",
        type: "return",
        ref: "BH-20251012",
        actor: "Trung tâm CSKH",
        note: "Khách phản ánh lỗi kết nối, tiếp nhận bảo hành.",
      },
      {
        time: "15/10/2025 • 14:10",
        type: "qa",
        ref: "QA-BH112",
        actor: "Kỹ thuật bảo hành",
        note: "Kiểm tra, thay module Wi-Fi, đang theo dõi kết quả.",
      },
    ],
  },
];

const STATUS_BADGE = {
  "Đang vận hành": "success",
  "Chờ lắp đặt": "info",
  "Đang bảo hành": "warning",
};

const ProductTrace = () => {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(TRACE_RECORDS[0].id);

  const filteredRecords = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return TRACE_RECORDS;
    return TRACE_RECORDS.filter(
      (record) =>
        record.serial.toLowerCase().includes(keyword) ||
        record.sku.toLowerCase().includes(keyword) ||
        record.productName.toLowerCase().includes(keyword) ||
        record.project.toLowerCase().includes(keyword)
    );
  }, [query]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedId) ?? filteredRecords[0];

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
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(TRACE_RECORDS[0].id);
              }}
            />
          </InputGroup>
        </div>
      </div>

      <div className="wm-grid-two">
        <section className="wm-surface">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="wm-section-title mb-0">Danh sách kết quả</h2>
            <span className="wm-subtle-text">{filteredRecords.length} kết quả</span>
          </div>

          <ListGroup className="wm-trace-list">
            {filteredRecords.map((record) => (
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
                    <Badge bg={STATUS_BADGE[record.status] ?? "secondary"} className="mb-1">
                      {record.status}
                    </Badge>
                    <div className="wm-subtle-text">{record.project}</div>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </section>

        <section className="wm-surface">
          {selectedRecord ? (
            <>
              <header className="wm-trace-header">
                <div>
                  <span className="wm-tag">{selectedRecord.serial}</span>
                  <h2 className="wm-section-title">{selectedRecord.productName}</h2>
                  <p className="wm-subtle-text mb-0">
                    SKU: {selectedRecord.sku} • Dự án: {selectedRecord.project}
                  </p>
                </div>
                <Badge bg={STATUS_BADGE[selectedRecord.status] ?? "primary"}>
                  {selectedRecord.status}
                </Badge>
              </header>

              <div className="wm-trace-meta">
                <div>
                  <FontAwesomeIcon icon={faLocationDot} />
                  <div>
                    <span>Vị trí hiện tại</span>
                    <strong>{selectedRecord.currentLocation}</strong>
                  </div>
                </div>
                <div>
                  <FontAwesomeIcon icon={faCircleInfo} />
                  <div>
                    <span>Dự án/Khách hàng</span>
                    <strong>{selectedRecord.project}</strong>
                  </div>
                </div>
              </div>

              <div className="wm-timeline">
                {selectedRecord.timeline.map((item) => (
                  <div key={item.ref} className="wm-timeline__item">
                    <div className={`wm-timeline__icon wm-timeline__icon--${item.type}`} />
                    <div className="wm-timeline__body">
                      <div className="wm-timeline__time">
                        <FontAwesomeIcon icon={faClock} />
                        {item.time}
                      </div>
                      <div className="wm-timeline__title">
                        <FontAwesomeIcon icon={faArrowRight} />
                        {item.ref}
                      </div>
                      <div className="wm-timeline__meta">
                        <span>{item.actor}</span>
                        <span>{item.note}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="wm-empty">
              Không tìm thấy dữ liệu truy xuất phù hợp với từ khóa của bạn.
            </div>
          )}
        </section>
      </div>
    </WarehouseLayout>
  );
};

export default ProductTrace;

