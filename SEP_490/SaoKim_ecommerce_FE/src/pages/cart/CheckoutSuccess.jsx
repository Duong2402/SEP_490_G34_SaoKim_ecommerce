import { Link, useLocation } from "react-router-dom";
import { Card, Container, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import "../../styles/checkout-success.css";

export default function CheckoutSuccess() {
  const location = useLocation();
  const name = location.state?.customer?.fullName;
  const total = location.state?.total;
  const method = location.state?.paymentMethod || "COD";
  const orderCode =
    location.state?.order?.orderCode ||
    location.state?.order?.code ||
    location.state?.order?.id ||
    null;

  const paymentLabel = method === "QR" ? "Chuyển khoản qua QR" : "COD";
  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(value) || 0);

  return (
    <div className="checkout-success-page">
      <HomepageHeader />
      <section className="success-section py-5">
        <Container className="d-flex justify-content-center">
          <Card className="success-card text-center">
            <Card.Body className="p-4 p-md-5">
              <div className="success-icon mb-3">
                <FontAwesomeIcon icon={faCircleCheck} size="2x" />
              </div>
              <h1 className="success-title mb-3">Đặt hàng thành công</h1>
              <p className="success-subtext mb-4">
                Cảm ơn {name ? <strong>{name}</strong> : "bạn"} đã mua hàng tại Sao Kim Lighting.
                Chúng tôi sẽ liên hệ để xác nhận đơn hàng trong thời gian sớm nhất.
              </p>

              <div className="success-summary d-grid gap-3 text-start">
                {typeof total === "number" && (
                  <div className="summary-row">
                    <span className="text-muted">Tổng giá trị đơn:</span>
                    <span className="text-accent fw-bold">{formatCurrency(total)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span className="text-muted">Phương thức thanh toán:</span>
                  <span className="fw-semibold">{paymentLabel}</span>
                </div>
                {orderCode && (
                  <div className="summary-row">
                    <span className="text-muted">Mã đơn:</span>
                    <span className="fw-semibold">#{orderCode}</span>
                  </div>
                )}
              </div>

              <div className="d-grid d-md-flex gap-3 justify-content-center mt-4">
                <Button as={Link} to="/" className="btn-saokim btn-responsive px-4">
                  Về trang chủ
                </Button>
                <Button
                  as={Link}
                  to="/account/orders"
                  variant="outline-primary"
                  className="rounded-pill btn-responsive px-4"
                >
                  Xem đơn hàng của tôi
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </section>
      <EcommerceFooter />
    </div>
  );
}
