import { Link, useLocation } from "react-router-dom";
import EcommerceHeader from "../../components/EcommerceHeader";

export default function CheckoutSuccess() {
  const location = useLocation();
  const name = location.state?.customer?.fullName;
  const total = location.state?.total;
  const method = location.state?.paymentMethod || "COD";
  return (
    <div className="checkout-success-page">
      <EcommerceHeader />
      <main style={{ padding: 24 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <h1>Đặt hàng thành công</h1>
          <p>Cảm ơn {name ? <strong>{name}</strong> : "quý khách"}. Chúng tôi sẽ liên hệ để xác nhận đơn.</p>
          {typeof total === "number" && (
            <p>Tổng giá trị đơn: <strong>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(total)}</strong></p>
          )}
          <p>Phương thức thanh toán: <strong>{method === "QR" ? "QR chuyển khoản" : "COD"}</strong></p>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 12 }}>
            <Link to="/" className="btn btn-primary">Về trang chủ</Link>
            <Link to="/projects" className="btn btn-outline">Xem dự án</Link>
          </div>
        </div>
      </main>
    </div>
  );
}


