// src/pages/staff-manager/invoices/InvoiceDetailStaff.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Row,
  Spinner,
  Table,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faArrowLeft,
  faFilePdf,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import StaffLayout from "../../../layouts/StaffLayout";
import useInvoicesApi from "../api/useInvoices";

export default function InvoiceDetailStaff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getInvoice, getPdfBlob } = useInvoicesApi();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("ID hóa đơn không hợp lệ");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await getInvoice(id);
        if (!cancelled) {
          setInvoice(data);
          setError("");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Không tải được chi tiết hóa đơn");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };

    // chỉ phụ thuộc id, không dùng getInvoice để tránh loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const formatMoney = (v) =>
    Number(v || 0).toLocaleString("vi-VN") + " ₫";

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
    return <Badge bg="secondary">{s || "-"}</Badge>;
  };

  const onPreviewPdf = async () => {
    try {
      const blob = await getPdfBlob(id, true);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
    } catch {
      alert("Xem PDF thất bại");
    }
  };

  const onDownloadPdf = async () => {
    try {
      const blob = await getPdfBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.code || "invoice"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Tải PDF thất bại");
    }
  };

  if (loading) {
    return (
      <StaffLayout>
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      </StaffLayout>
    );
  }

  if (error || !invoice) {
    return (
      <StaffLayout>
        <div className="text-center py-5 text-danger">
          {error || "Không tìm thấy hóa đơn"}
        </div>
      </StaffLayout>
    );
  }

  // normalize các field tiền
  const subtotal = invoice.subtotal ?? invoice.Subtotal ?? 0;
  const discount = invoice.discount ?? invoice.Discount ?? 0;
  const tax = invoice.tax ?? invoice.Tax ?? 0;
  const shippingFee = invoice.shippingFee ?? invoice.ShippingFee ?? 0;
  const total = invoice.total ?? invoice.Total ?? 0;

  return (
    <StaffLayout>
      {/* HEADER */}
      <div className="staff-page-header">
        <div>
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
            <Breadcrumb.Item
              linkAs={Link}
              linkProps={{ to: "/staff/invoices" }}
            >
              Hóa đơn
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Chi tiết hóa đơn</Breadcrumb.Item>
          </Breadcrumb>

          <h4 className="staff-page-title">Chi tiết hóa đơn</h4>
          <p className="staff-page-lead">Thông tin chi tiết của hóa đơn</p>
        </div>

        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Quay lại
          </Button>

          {invoice.hasPdf && (
            <>
              <Button variant="dark" onClick={onPreviewPdf}>
                <FontAwesomeIcon icon={faFilePdf} className="me-2" />
                Xem PDF
              </Button>
              <Button variant="secondary" onClick={onDownloadPdf}>
                <FontAwesomeIcon icon={faDownload} className="me-2" />
                Tải PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* BODY */}
      <Card className="p-3">
        <Row className="mb-3">
          <Col md={6}>
            <div className="fw-bold">Mã hóa đơn:</div>
            <div>{invoice.code}</div>
          </Col>
          <Col md={6}>
            <div className="fw-bold">Trạng thái:</div>
            <div>{renderStatus(invoice.status)}</div>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col md={6}>
            <div className="fw-bold">Khách hàng:</div>
            <div>{invoice.customer}</div>
          </Col>
          <Col md={6}>
            <div className="fw-bold">Email / SĐT:</div>
            <div>
              {invoice.email || "-"} / {invoice.phone || "-"}
            </div>
          </Col>
        </Row>

        {/* DANH SÁCH SẢN PHẨM */}
        <h5 className="mt-4 mb-3">Sản phẩm trong hóa đơn</h5>

        <Table bordered hover size="sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Sản phẩm</th>
              <th className="text-end">SL</th>
              <th className="text-end">Đơn giá</th>
              <th className="text-end">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{it.productName}</td>
                <td className="text-end">{it.qty ?? it.quantity}</td>
                <td className="text-end">{formatMoney(it.unitPrice)}</td>
                <td className="text-end">{formatMoney(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        {/* SUMMARY BOX BÊN PHẢI */}
        <div className="d-flex justify-content-end mt-4">
          <div
            className="border rounded-3 p-3"
            style={{
              minWidth: 320,
              maxWidth: 360,
              backgroundColor: "#f8f9fa",
            }}
          >
            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">Tạm tính</span>
              <span className="fw-semibold">{formatMoney(subtotal)}</span>
            </div>

            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">Giảm giá</span>
              <span className="fw-semibold">
                {discount > 0
                  ? "-" + formatMoney(discount)
                  : formatMoney(0)}
              </span>
            </div>

            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">Phí ship</span>
              <span className="fw-semibold">{formatMoney(shippingFee)}</span>
            </div>

            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">Thuế</span>
              <span className="fw-semibold">{formatMoney(tax)}</span>
            </div>

            <hr className="my-2" />

            <div className="d-flex justify-content-between py-1">
              <span className="fw-bold">Tổng cộng</span>
              <span className="fw-bold" style={{ fontSize: "1.05rem" }}>
                {formatMoney(total)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </StaffLayout>
  );
}
