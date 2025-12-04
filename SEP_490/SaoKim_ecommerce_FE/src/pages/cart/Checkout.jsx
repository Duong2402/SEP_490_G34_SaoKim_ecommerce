import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
} from "react-bootstrap";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import { readCart, writeCart, getCartKeys } from "../../api/cartStorage.js";
import "../../styles/checkout.css";

// Helpers per user session
function readCheckoutItemsForOwner() {
  try {
    const { checkoutKey } = getCartKeys();
    const raw = localStorage.getItem(checkoutKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Checkout() {
  const navigate = useNavigate();
  const apiBase = "https://localhost:7278";

  const [cartItems, setCartItems] = useState(() => readCart());
  const [checkoutItems, setCheckoutItems] = useState(() => readCheckoutItemsForOwner());

  const itemsForCheckout =
    checkoutItems && checkoutItems.length > 0 ? checkoutItems : cartItems;

  const [selectedIds, setSelectedIds] = useState(new Set());

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    line1: "",
    note: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [submitting, setSubmitting] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const [shippingMethod, setShippingMethod] = useState("standard");
  const [shippingFee, setShippingFee] = useState(20000);

  const [voucherCode, setVoucherCode] = useState("");
  const [voucherList] = useState([
    { code: "SALE10", label: "Giảm 10%", type: "percent", value: 10 },
    { code: "GIAM30K", label: "Giảm 30.000đ", type: "amount", value: 30000 },
  ]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherStatus, setVoucherStatus] = useState(null);

  // VietQR state
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [autoCheck, setAutoCheck] = useState(false);

  const shippingOptions = [
    { value: "standard", label: "Tiết kiệm", time: "Giao 3 - 5 ngày" },
    { value: "fast", label: "Nhanh", time: "Giao 1 - 2 ngày" },
    { value: "express", label: "Hoả tốc", time: "Giao trong ngày" },
  ];

  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(Number(value) || 0);

  // Sync storage
  useEffect(() => {
    const onStorage = () => {
      setCartItems(readCart());
      setCheckoutItems(readCheckoutItemsForOwner());
    };

    onStorage();

    window.addEventListener("storage", onStorage);
    window.addEventListener("localStorageChange", onStorage);
    window.addEventListener("auth:changed", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("localStorageChange", onStorage);
      window.removeEventListener("auth:changed", onStorage);
    };
  }, []);

  useEffect(() => {
    const base = checkoutItems && checkoutItems.length > 0 ? checkoutItems : cartItems;
    setSelectedIds(new Set(base.map((x) => x.id)));
  }, [checkoutItems, cartItems]);

  // Load saved addresses
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const list = await res.json();
        setAddresses(list);

        if (list.length > 0) {
          const def = list.find((x) => x.isDefault) || list[0];
          if (def) {
            setSelectedAddressId(def.addressId);
            setForm({
              fullName: def.recipientName,
              phone: def.phoneNumber,
              line1: def.line1 ?? "",
              note: "",
            });
          }
        } else {
          setSelectedAddressId(null);
        }
      } catch {
        // ignore
      }
    })();
  }, [apiBase]);

  // Shipping fee for selected address
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    if (!selectedAddressId) return;

    (async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/shipping/fee?addressId=${selectedAddressId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.fee === "number") {
          setShippingFee(data.fee);
        }
      } catch {
        // keep old fee on error
      }
    })();
  }, [selectedAddressId, apiBase]);

  // Selected items / subtotal
  const selectedItems = useMemo(
    () => itemsForCheckout.filter((it) => selectedIds.has(it.id)),
    [itemsForCheckout, selectedIds]
  );

  const subtotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 0),
        0
      ),
    [selectedItems]
  );

  const discount = useMemo(() => {
    if (!selectedVoucher) return 0;
    if (selectedVoucher.type === "percent")
      return Math.min((subtotal * selectedVoucher.value) / 100, 100000);
    if (selectedVoucher.type === "amount") return selectedVoucher.value;
    return 0;
  }, [selectedVoucher, subtotal]);

  const total = Math.max(subtotal + shippingFee - discount, 0);
  const qrAmount = Math.round(Number(total) || 0);
  const noneChecked = selectedIds.size === 0;

  // checkPaid: call backend to verify VietQR
  const checkPaid = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${apiBase}/api/payments/check-vietqr?amount=${qrAmount}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        console.error("checkPaid backend error", await res.text());
        return false;
      }

      const data = await res.json();
      return !!data.matched;
    } catch (e) {
      console.error("Error verifying payment", e);
      return false;
    }
  };

  // Polling auto-check when QR selected
  useEffect(() => {
    let interval;

    if (paymentMethod === "QR" && autoCheck && !paymentVerified) {
      interval = setInterval(async () => {
        const paid = await checkPaid();
        if (paid) {
          setPaymentVerified(true);
        }
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentMethod, autoCheck, paymentVerified, subtotal, qrAmount]);

  // Apply voucher
  const handleApplyVoucher = () => {
    const found = voucherList.find(
      (v) => v.code.toLowerCase() === voucherCode.toLowerCase()
    );
    if (found) {
      setSelectedVoucher(found);
      setVoucherStatus({ type: "success", message: `Đã áp dụng: ${found.label}` });
    } else {
      setSelectedVoucher(null);
      setVoucherStatus({ type: "error", message: "Mã giảm giá không hợp lệ" });
    }
  };

  // PAY
  const handlePay = async () => {
    if (!selectedItems.length) {
      alert("Không có sản phẩm nào để thanh toán");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Bạn cần đăng nhập trước");
      navigate("/login");
      return;
    }

    if (!selectedAddressId) {
      alert("Vui lòng thêm hoặc chọn địa chỉ giao hàng");
      navigate("/account/addresses", { state: { from: "/checkout" } });
      return;
    }

    if (paymentMethod === "QR" && !paymentVerified) {
      alert(
        "Thanh toán QR chưa được xác nhận. Vui lòng chuyển khoản và đợi hệ thống báo Thanh toán thành công."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        subtotal,
        addressId: selectedAddressId,
        status: paymentMethod === "COD" ? "Pending" : "Paid",
        paymentMethod,
        shippingMethod,
        note: form.note,
        items: selectedItems.map((it) => {
          const productId = Number(
            it.productId ?? it.productID ?? it.product_id ?? it.id
          );
          return {
            productId,
            quantity: Number(it.quantity) || 1,
            price: Number(it.price) || 0,
          };
        }),
      };

      const res = await fetch(`${apiBase}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Order error:", err);
        alert("Tạo đơn không thành công: " + err);
        return;
      }

      const createdOrder = await res.json();
      const backendTotal =
        typeof createdOrder.total === "number" ? createdOrder.total : total;

      const fullCart = readCart();
      const remain = fullCart.filter((it) => !selectedIds.has(it.id));
      writeCart(remain);

      const { checkoutKey } = getCartKeys();
      localStorage.removeItem(checkoutKey);

      navigate("/checkout/success", {
        replace: true,
        state: {
          customer: form,
          total: backendTotal,
          paymentMethod,
          shippingMethod,
          selectedVoucher,
          purchased: selectedItems,
          order: createdOrder,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!itemsForCheckout.length) {
    return (
      <div className="checkout-page">
        <HomepageHeader />
        <section className="checkout-section py-5">
          <Container>
            <Breadcrumb className="checkout-breadcrumb mb-3">
              <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
                Trang chủ
              </Breadcrumb.Item>
              <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/cart" }}>
                Giỏ hàng
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Thanh toán</Breadcrumb.Item>
            </Breadcrumb>
            <Card className="checkout-card text-center empty-state-card mx-auto">
              <Card.Body className="py-5">
                <h2 className="fw-bold text-primary mb-2">
                  Không có sản phẩm nào để thanh toán.
                </h2>
                <p className="text-muted mb-4">Vui lòng quay lại giỏ hàng.</p>
                <Button
                  as={Link}
                  to="/cart"
                  variant="outline-primary"
                  className="rounded-pill px-4"
                >
                  Xem giỏ hàng
                </Button>
              </Card.Body>
            </Card>
          </Container>
        </section>
        <EcommerceFooter />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <HomepageHeader />
      <section className="checkout-section py-5">
        <Container className="checkout-container">
          <Breadcrumb className="checkout-breadcrumb mb-3">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
              Trang chủ
            </Breadcrumb.Item>
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/cart" }}>
              Giỏ hàng
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Thanh toán</Breadcrumb.Item>
          </Breadcrumb>

          <div className="d-flex flex-column gap-2 mb-4">
            <h1 className="checkout-title display-5 fw-bold mb-0">
              Thanh toán
            </h1>
            <p className="checkout-subtitle text-muted mb-0">
              Xem lại thông tin giao hàng, vận chuyển và hoàn tất đơn hàng của bạn.
            </p>
          </div>

          <Row className="g-4">
            <Col lg={8}>
              <Form className="checkout-form" onSubmit={(e) => e.preventDefault()}>
                <Card className="checkout-card mb-4">
                  <Card.Body>
                    <div className="d-flex justify-content-between flex-wrap gap-3 align-items-start mb-2">
                      <div>
                        <Card.Title className="checkout-card-title mb-1">
                          Địa chỉ giao hàng
                        </Card.Title>
                        <small className="text-muted">
                          Chọn địa chỉ sẵn có hoặc thêm mới để giao hàng.
                        </small>
                      </div>
                    </div>

                    {addresses.length === 0 ? (
                      <div className="mt-2">
                        <p className="text-muted mb-3">Bạn chưa có địa chỉ giao hàng.</p>
                        <Button
                          variant="outline-primary"
                          className="rounded-pill"
                          onClick={() =>
                            navigate("/account/addresses", {
                              state: { from: "/checkout" },
                            })
                          }
                        >
                          Thêm địa chỉ mới
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="d-grid gap-3 mt-3">
                          {addresses.map((a) => (
                            <label
                              key={a.addressId}
                              className={`address-option ${
                                selectedAddressId === a.addressId ? "active" : ""
                              }`}
                            >
                              <Form.Check
                                type="radio"
                                name="addr"
                                checked={selectedAddressId === a.addressId}
                                onChange={() => {
                                  setSelectedAddressId(a.addressId);
                                  setForm((f) => ({
                                    ...f,
                                    fullName: a.recipientName,
                                    phone: a.phoneNumber,
                                    line1: a.line1 ?? "",
                                  }));
                                }}
                                className="mt-1 me-3"
                              />
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center flex-wrap gap-2">
                                  <span className="address-name">{a.recipientName}</span>
                                  <span className="text-muted small">• {a.phoneNumber}</span>
                                  {a.isDefault && (
                                    <span className="badge-soft-primary">Mặc định</span>
                                  )}
                                </div>
                                <div className="address-meta">
                                  {[a.line1, a.ward, a.district, a.province]
                                    .filter(Boolean)
                                    .join(", ")}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3">
                          <Button
                            variant="outline-primary"
                            className="rounded-pill"
                            onClick={() =>
                              navigate("/account/addresses", {
                                state: { from: "/checkout" },
                              })
                            }
                          >
                            Thêm địa chỉ mới
                          </Button>
                        </div>
                      </>
                    )}

                    <Form.Group className="mt-4 note-box">
                      <Form.Label className="fw-semibold text-muted small mb-2">
                        Ghi chú đơn hàng (tùy chọn)
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Ví dụ: Giao lắp buổi chiều, kiểm tra hàng trước khi nhận..."
                        value={form.note}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            note: e.target.value,
                          }))
                        }
                        className="rounded-3"
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>

                <Card className="checkout-card mb-4">
                  <Card.Body>
                    <Card.Title className="checkout-card-title mb-3">
                      Phương thức vận chuyển
                    </Card.Title>
                    <div className="d-grid gap-3">
                      {shippingOptions.map((opt) => (
                        <label
                          key={opt.value}
                          className={`shipping-option ${
                            shippingMethod === opt.value ? "active" : ""
                          }`}
                        >
                          <Form.Check
                            type="radio"
                            name="shipping"
                            checked={shippingMethod === opt.value}
                            onChange={() => setShippingMethod(opt.value)}
                            className="mt-1 me-3"
                          />
                          <div className="w-100">
                            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                              <div>
                                <div className="fw-semibold text-primary">{opt.label}</div>
                                <div className="text-muted small">{opt.time}</div>
                              </div>
                              <div className="text-end">
                                <div className="fw-semibold text-dark">
                                  {formatCurrency(shippingFee)}
                                </div>
                                <div className="text-muted small">Ước tính phí</div>
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </Card.Body>
                </Card>

                <Card className="checkout-card mb-4">
                  <Card.Body>
                    <Card.Title className="checkout-card-title mb-3">
                      Phương thức thanh toán
                    </Card.Title>
                    <div className="d-grid gap-3">
                      <label
                        className={`payment-option ${
                          paymentMethod === "COD" ? "active" : ""
                        }`}
                      >
                        <Form.Check
                          type="radio"
                          name="payment"
                          checked={paymentMethod === "COD"}
                          onChange={() => {
                            setPaymentMethod("COD");
                            setPaymentVerified(false);
                            setAutoCheck(false);
                          }}
                          className="mt-1 me-3"
                        />
                        <div>
                          <div className="fw-semibold text-primary">
                            Thanh toán khi nhận hàng (COD)
                          </div>
                          <div className="text-muted small">
                            Thanh toán tiền mặt khi nhận hàng tại địa chỉ giao hàng.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`payment-option ${
                          paymentMethod === "QR" ? "active" : ""
                        }`}
                      >
                        <Form.Check
                          type="radio"
                          name="payment"
                          checked={paymentMethod === "QR"}
                          onChange={() => {
                            setPaymentMethod("QR");
                            setPaymentVerified(false);
                            setAutoCheck(true);
                          }}
                          className="mt-1 me-3"
                        />
                        <div>
                          <div className="fw-semibold text-primary">Chuyển khoản qua QR</div>
                          <div className="text-muted small">
                            Quét mã QR để thanh toán chuyển khoản.
                          </div>
                        </div>
                      </label>
                    </div>

                    {paymentMethod === "QR" && (
                      <div className="qr-box mt-3">
                        <div className="d-flex flex-wrap gap-3 align-items-start">
                          <img
                            alt="QR thanh toán"
                            width={180}
                            className="qr-image rounded-3"
                            src={`https://img.vietqr.io/image/MB-0000126082016-qr_only.png?amount=${qrAmount}&addInfo=${encodeURIComponent(
                              " thanh toan don hang"
                            )}`}
                          />
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <span className="badge-soft-primary">Tài khoản MB Bank</span>
                              <span className="text-muted small">
                                Số tiền: {formatCurrency(qrAmount)}
                              </span>
                            </div>
                            {!paymentVerified && (
                              <p className="text-muted small mb-2">
                                Đang chờ thanh toán qua QR. Hệ thống sẽ tự động ghi nhận khi tiền về
                                tài khoản.
                              </p>
                            )}
                            {paymentVerified && (
                              <p className="text-success fw-semibold mb-0">
                                Thanh toán thành công!
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>

                <Card className="checkout-card mb-4">
                  <Card.Body>
                    <Card.Title className="checkout-card-title mb-3">Mã giảm giá</Card.Title>
                    <InputGroup className="discount-group">
                      <Form.Control
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value)}
                        placeholder="Nhập mã giảm giá"
                        className="rounded-start-pill"
                      />
                      <Button
                        type="button"
                        className="btn-saokim rounded-end-pill px-4"
                        onClick={handleApplyVoucher}
                      >
                        Áp dụng
                      </Button>
                    </InputGroup>

                    {selectedVoucher && (
                      <div className="mt-2 text-success fw-semibold small">
                        Đã áp dụng: {selectedVoucher.label}
                      </div>
                    )}
                    {voucherStatus?.type === "error" && (
                      <div className="mt-2 text-danger small">{voucherStatus.message}</div>
                    )}
                  </Card.Body>
                </Card>
              </Form>
            </Col>

            <Col lg={4}>
              <Card className="checkout-card order-summary-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Card.Title className="checkout-card-title mb-0">
                      Tóm tắt đơn hàng
                    </Card.Title>
                    <span className="badge-soft-primary">
                      {selectedItems.length} sản phẩm
                    </span>
                  </div>

                  <div className="summary-list">
                    {selectedItems.map((it) => (
                      <div key={it.id} className="summary-item">
                        <div className="flex-grow-1">
                          <div className="fw-semibold text-primary">{it.name}</div>
                          <div className="text-muted small">× {it.quantity}</div>
                        </div>
                        <div className="text-end text-dark fw-semibold">
                          {formatCurrency(it.price)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="summary-divider my-3"></div>

                  <div className="summary-pricing">
                    <div className="summary-row">
                      <span>Tạm tính:</span>
                      <span className="fw-semibold">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="summary-row">
                      <span>Phí ship:</span>
                      <span className="fw-semibold">{formatCurrency(shippingFee)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="summary-row text-success">
                        <span>Giảm giá:</span>
                        <span className="fw-semibold">-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="summary-row total-row">
                      <span>Tổng cộng:</span>
                      <span className="total-amount">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="d-grid gap-2 mt-4">
                    <Button
                      type="button"
                      className="btn-saokim w-100 py-3"
                      disabled={
                        submitting ||
                        noneChecked ||
                        (paymentMethod === "QR" && !paymentVerified)
                      }
                      onClick={handlePay}
                    >
                      {noneChecked ? "Chọn sản phẩm để thanh toán" : "Đặt hàng"}
                    </Button>
                    <Button
                      as={Link}
                      to="/cart"
                      variant="outline-primary"
                      className="rounded-pill w-100"
                    >
                      Quay lại giỏ hàng
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
      <EcommerceFooter />
    </div>
  );
}
