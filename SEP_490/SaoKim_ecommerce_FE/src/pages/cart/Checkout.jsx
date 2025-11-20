import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EcommerceHeader from "../../components/EcommerceHeader";
import { readCart, writeCart, getCartKeys } from "../../api/cartStorage.js";

/* ---------- Helpers gắn với từng user ---------- */
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

/* ---------- Component ---------- */
export default function Checkout() {
  const navigate = useNavigate();
  const apiBase = "https://localhost:7278";

  // Giỏ đầy đủ (theo user hiện tại)
  const [cartItems, setCartItems] = useState(() => readCart());
  // Danh sách sản phẩm được chọn thanh toán (checkoutItems_<owner>)
  const [checkoutItems, setCheckoutItems] = useState(
    () => readCheckoutItemsForOwner()
  );

  // Nếu có checkoutItems thì dùng, không thì fallback toàn bộ giỏ
  const itemsForCheckout =
    checkoutItems && checkoutItems.length > 0 ? checkoutItems : cartItems;

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    note: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [submitting, setSubmitting] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherList] = useState([
    { code: "SALE10", label: "Giảm 10%", type: "percent", value: 10 },
    { code: "GIAM30K", label: "Giảm 30.000đ", type: "amount", value: 30000 },
  ]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  /* ---------- Sync localStorage / đổi user ---------- */
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

  /* ---------- Khi danh sách sản phẩm thay đổi, chọn hết ---------- */
  useEffect(() => {
    const base =
      checkoutItems && checkoutItems.length > 0 ? checkoutItems : cartItems;
    setSelectedIds(new Set(base.map((x) => x.id)));
  }, [checkoutItems, cartItems]);

  /* ---------- Load địa chỉ ---------- */
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

        const def = list.find((x) => x.isDefault) || list[0];
        if (def) {
          setSelectedAddressId(def.addressId);
          setForm({
            fullName: def.recipientName,
            phone: def.phoneNumber,
            address: [def.line1, def.line2, def.ward, def.district, def.province]
              .filter(Boolean)
              .join(", "),
            note: "",
          });
        }
      } catch {
        // bỏ qua lỗi
      }
    })();
  }, [apiBase]);

  /* ---------- Selected items ---------- */
  const selectedItems = useMemo(
    () =>
      itemsForCheckout.filter((it) => selectedIds.has(it.id)),
    [itemsForCheckout, selectedIds]
  );

  const subtotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, it) =>
          sum + Number(it.price || 0) * Number(it.quantity || 0),
        0
      ),
    [selectedItems]
  );

  const shippingFee = useMemo(() => {
    switch (shippingMethod) {
      case "fast":
        return 40000;
      case "express":
        return 60000;
      default:
        return 25000;
    }
  }, [shippingMethod]);

  const discount = useMemo(() => {
    if (!selectedVoucher) return 0;
    if (selectedVoucher.type === "percent")
      return Math.min((subtotal * selectedVoucher.value) / 100, 100000);
    if (selectedVoucher.type === "amount") return selectedVoucher.value;
    return 0;
  }, [selectedVoucher, subtotal]);

  const total = Math.max(subtotal + shippingFee - discount, 0);
  const noneChecked = selectedIds.size === 0;

  /* ---------- Apply voucher ---------- */
  const handleApplyVoucher = () => {
    const found = voucherList.find(
      (v) => v.code.toLowerCase() === voucherCode.toLowerCase()
    );
    if (found) setSelectedVoucher(found);
    else alert("Mã giảm giá không hợp lệ");
  };

  /* ---------- PAY: tạo đơn + xóa khỏi giỏ sau khi thành công ---------- */
  const handlePay = async () => {
    console.log("HANDLE PAY CLICK");

    if (!selectedItems.length) {
      alert("Không có sản phẩm nào để thanh toán");
      return;
    }
    if (!form.fullName || !form.phone || !form.address) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Bạn cần đăng nhập trước");
      navigate("/login");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        total,
        status: paymentMethod === "COD" ? "Pending" : "Paid",
        paymentMethod,
        shippingMethod,
        note: form.note,
        items: selectedItems.map((it) => ({
          productId: it.id,
          quantity: it.quantity,
          price: it.price,
        })),
      };

      console.log("CALL /api/orders", payload);

      const res = await fetch(`${apiBase}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("RESULT /api/orders", res.status);

      if (!res.ok) {
        const err = await res.text();
        console.error("Order error:", err);
        alert("Tạo đơn không thành công: " + err);
        return;
      }

      const createdOrder = await res.json();

      // Lúc này mới xóa các sản phẩm đã thanh toán khỏi GIỎ của user hiện tại
      const fullCart = readCart(); // đọc lại giỏ mới nhất
      const remain = fullCart.filter((it) => !selectedIds.has(it.id));
      writeCart(remain);

      // Xóa checkoutItems_<owner>
      const { checkoutKey } = getCartKeys();
      localStorage.removeItem(checkoutKey);

      navigate("/checkout/success", {
        replace: true,
        state: {
          customer: form,
          total,
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

  /* ---------- Render ---------- */
  if (!itemsForCheckout.length) {
    return (
      <div className="checkout-page">
        <EcommerceHeader />
        <main className="checkout-main" style={{ padding: 24 }}>
          <div
            className="checkout-container"
            style={{ maxWidth: 1040, margin: "0 auto" }}
          >
            <h1 style={{ marginBottom: 16 }}>Thanh toán</h1>
            <p>Giỏ hàng trống. Vui lòng thêm sản phẩm</p>
            <Link to="/" className="btn btn-primary">
              Về trang chủ
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <EcommerceHeader />
      <main className="checkout-main" style={{ padding: 24 }}>
        <div
          className="checkout-container"
          style={{ maxWidth: 1040, margin: "0 auto" }}
        >
          <h1 style={{ marginBottom: 16 }}>Thanh toán</h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: 24,
            }}
          >
            {/* LEFT SECTION */}
            <section>
              {/* Bỏ onSubmit, dùng button tự gọi handlePay */}
              <form>
                <div style={{ display: "grid", gap: 12 }}>
                  {/* --- ĐỊA CHỈ --- */}
                  {addresses.length > 0 && (
                    <div
                      style={{
                        padding: 12,
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                      }}
                    >
                      <strong>Địa chỉ giao hàng</strong>
                      {addresses.map((a) => (
                        <label
                          key={a.addressId}
                          style={{ display: "flex", gap: 10 }}
                        >
                          <input
                            type="radio"
                            name="addr"
                            checked={selectedAddressId === a.addressId}
                            onChange={() => {
                              setSelectedAddressId(a.addressId);
                              setForm({
                                ...form,
                                fullName: a.recipientName,
                                phone: a.phoneNumber,
                                address: [
                                  a.line1,
                                  a.line2,
                                  a.ward,
                                  a.district,
                                  a.province,
                                ]
                                  .filter(Boolean)
                                  .join(", "),
                              });
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {a.recipientName} • {a.phoneNumber}{" "}
                              {a.isDefault && (
                                <span style={{ color: "#2563eb" }}>
                                  (Mặc định)
                                </span>
                              )}
                            </div>
                            <div
                              style={{ fontSize: 13, color: "#667" }}
                            >
                              {[
                                a.line1,
                                a.line2,
                                a.ward,
                                a.district,
                                a.province,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* --- SHIPPING --- */}
                  <fieldset
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <legend>Phương thức vận chuyển</legend>

                    <label>
                      <input
                        type="radio"
                        value="standard"
                        checked={shippingMethod === "standard"}
                        onChange={() => setShippingMethod("standard")}
                      />{" "}
                      Tiết kiệm - 25.000đ
                    </label>

                    <label>
                      <input
                        type="radio"
                        value="fast"
                        checked={shippingMethod === "fast"}
                        onChange={() => setShippingMethod("fast")}
                      />{" "}
                      Nhanh - 40.000đ
                    </label>

                    <label>
                      <input
                        type="radio"
                        value="express"
                        checked={shippingMethod === "express"}
                        onChange={() => setShippingMethod("express")}
                      />{" "}
                      Hỏa tốc - 60.000đ
                    </label>
                  </fieldset>

                  {/* --- PAYMENT --- */}
                  <fieldset
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <legend>Phương thức thanh toán</legend>

                    <label>
                      <input
                        type="radio"
                        checked={paymentMethod === "COD"}
                        onChange={() => setPaymentMethod("COD")}
                      />{" "}
                      Thanh toán khi nhận hàng (COD)
                    </label>

                    <label>
                      <input
                        type="radio"
                        checked={paymentMethod === "QR"}
                        onChange={() => setPaymentMethod("QR")}
                      />{" "}
                      Chuyển khoản qua QR
                    </label>

                    {paymentMethod === "QR" && (
                      <div style={{ marginTop: 12 }}>
                        <img
                          alt="QR thanh toán"
                          width={160}
                          src={`https://img.vietqr.io/image/BIDV-4270797287-qr_only.png?amount=${total}&addInfo=Thanh%20toan`}
                        />
                      </div>
                    )}
                  </fieldset>

                  {/* --- DISCOUNT --- */}
                  <fieldset
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <legend>Mã giảm giá</legend>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={voucherCode}
                        onChange={(e) =>
                          setVoucherCode(e.target.value)
                        }
                        placeholder="Nhập mã giảm giá"
                      />
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                      >
                        Áp dụng
                      </button>
                    </div>

                    {selectedVoucher && (
                      <p
                        style={{
                          marginTop: 6,
                          fontSize: 13,
                          color: "#16a34a",
                        }}
                      >
                        Đã áp dụng: {selectedVoucher.label}
                      </p>
                    )}
                  </fieldset>
                </div>

                {/* --- PAY BUTTON --- */}
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 12,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={submitting || noneChecked}
                    onClick={handlePay}
                  >
                    {noneChecked
                      ? "Chọn sản phẩm để thanh toán"
                      : "Thanh toán"}
                  </button>

                  <Link
                    to="/cart"
                    className="btn btn-outline"
                  >
                    Quay lại giỏ hàng
                  </Link>
                </div>
              </form>
            </section>

            {/* RIGHT COLUMN */}
            <aside
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h3>Tóm tắt đơn hàng</h3>
              <ul
                style={{
                  maxHeight: 300,
                  overflowY: "auto",
                  padding: 0,
                  listStyle: "none",
                }}
              >
                {selectedItems.map((it) => (
                  <li
                    key={it.id}
                    style={{
                      borderBottom: "1px dashed #ddd",
                      padding: "6px 0",
                    }}
                  >
                    <div>
                      {it.name} × {it.quantity}
                    </div>
                    <div
                      style={{ fontSize: 13, color: "#667" }}
                    >
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(it.price)}
                    </div>
                  </li>
                ))}
              </ul>

              <div
                style={{
                  borderTop: "1px solid #ddd",
                  marginTop: 12,
                  paddingTop: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Tạm tính:</span>{" "}
                  <strong>{subtotal.toLocaleString()}đ</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Phí ship:</span>{" "}
                  <strong>{shippingFee.toLocaleString()}đ</strong>
                </div>
                {discount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#16a34a",
                    }}
                  >
                    <span>Giảm giá:</span>{" "}
                    <strong>
                      -{discount.toLocaleString()}đ
                    </strong>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  <span>Tổng cộng:</span>{" "}
                  <span>{total.toLocaleString()}đ</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
