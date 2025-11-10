import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EcommerceHeader from "../../components/EcommerceHeader";

/* ---------- Helpers ---------- */
function readCart() {
  try {
    const raw = localStorage.getItem("cartItems");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readCheckoutItems() {
  try {
    const raw = localStorage.getItem("checkoutItems");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem("cartItems", JSON.stringify(items ?? []));
  const totalQty = (items ?? []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  localStorage.setItem("cartCount", String(totalQty));
  window.dispatchEvent(new Event("localStorageChange"));
}

/* ---------- Component ---------- */
export default function Checkout() {
  const navigate = useNavigate();
  const apiBase = "https://localhost:7278";

  const [checkoutItems, setCheckoutItems] = useState(() => readCheckoutItems());
  const [cartItems, setCartItems] = useState(() => readCart());
  const itemsForCheckout = checkoutItems.length > 0 ? checkoutItems : cartItems;

  const [selectedIds, setSelectedIds] = useState(() => new Set(itemsForCheckout.map((x) => x.id)));
  const [form, setForm] = useState({ fullName: "", phone: "", address: "", note: "" });
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

  /* ---------- Sync localStorage ---------- */
  useEffect(() => {
    const onStorage = () => {
      setCartItems(readCart());
      setCheckoutItems(readCheckoutItems());
    };
    window.addEventListener("localStorageChange", onStorage);
    return () => window.removeEventListener("localStorageChange", onStorage);
  }, []);

  /* ---------- Load địa chỉ từ API ---------- */
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
          setForm((prev) => ({
            ...prev,
            fullName: def.recipientName || prev.fullName,
            phone: def.phoneNumber || prev.phone,
            address: [def.line1, def.line2, def.ward, def.district, def.province]
              .filter(Boolean)
              .join(", ") || prev.address,
          }));
        }
      } catch {}
    })();
  }, []);

  /* ---------- Filter sản phẩm đã chọn ---------- */
  const selectedItems = useMemo(
    () => itemsForCheckout.filter((it) => selectedIds.has(it.id)),
    [itemsForCheckout, selectedIds]
  );

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0),
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

  /* ---------- Handlers ---------- */
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === itemsForCheckout.length) return new Set();
      return new Set(itemsForCheckout.map((x) => x.id));
    });
  };

  const handleApplyVoucher = () => {
    const found = voucherList.find((v) => v.code.toLowerCase() === voucherCode.toLowerCase());
    if (found) setSelectedVoucher(found);
    else alert("Mã giảm giá không hợp lệ!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItems.length) return;
    if (!form.fullName || !form.phone || !form.address) return;

    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const remain = cartItems.filter((it) => !selectedIds.has(it.id));
      writeCart(remain);
      localStorage.removeItem("checkoutItems");

      navigate("/checkout/success", {
        replace: true,
        state: { customer: form, total, paymentMethod, shippingMethod, selectedVoucher, purchased: selectedItems },
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="checkout-page">
      <EcommerceHeader />
      <main className="checkout-main" style={{ padding: 24 }}>
        <div className="checkout-container" style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h1 style={{ marginBottom: 16 }}>Thanh toán</h1>

          {!itemsForCheckout.length ? (
            <div>
              <p>Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.</p>
              <Link to="/" className="btn btn-primary">Về trang chủ</Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
              {/* --- FORM GIAO HÀNG + THANH TOÁN --- */}
              <section>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gap: 12 }}>
                    {/* Địa chỉ */}
                    {addresses.length > 0 && (
                      <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                        <strong>Địa chỉ giao hàng</strong>
                        {addresses.map((a) => (
                          <label key={a.addressId} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <input
                              type="radio"
                              name="addr"
                              checked={selectedAddressId === a.addressId}
                              onChange={() => {
                                setSelectedAddressId(a.addressId);
                                setForm((prev) => ({
                                  ...prev,
                                  fullName: a.recipientName || prev.fullName,
                                  phone: a.phoneNumber || prev.phone,
                                  address: [a.line1, a.line2, a.ward, a.district, a.province].filter(Boolean).join(", "),
                                }));
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {a.recipientName} • {a.phoneNumber}{" "}
                                {a.isDefault && <span style={{ color: "#2563eb" }}>(Mặc định)</span>}
                              </div>
                              <div style={{ color: "#667", fontSize: 13 }}>
                                {[a.line1, a.line2, a.ward, a.district, a.province].filter(Boolean).join(", ")}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Vận chuyển */}
                    <fieldset
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <legend style={{ padding: "0 6px" }}>Phương thức vận chuyển</legend>

                      <label
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        <input
                          type="radio"
                          value="standard"
                          checked={shippingMethod === "standard"}
                          onChange={() => setShippingMethod("standard")}
                        />
                        {" "}Tiết kiệm - 25.000đ
                      </label>

                      <label
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        <input
                          type="radio"
                          value="fast"
                          checked={shippingMethod === "fast"}
                          onChange={() => setShippingMethod("fast")}
                        />
                        {" "}Nhanh - 40.000đ
                      </label>

                      <label
                        style={{ display: "block" }}
                      >
                        <input
                          type="radio"
                          value="express"
                          checked={shippingMethod === "express"}
                          onChange={() => setShippingMethod("express")}
                        />
                        {" "}Hỏa tốc - 60.000đ
                      </label>
                    </fieldset>


                    {/* Thanh toán */}
                    <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                      <legend style={{ padding: "0 6px" }}>Phương thức thanh toán</legend>
                      <label><input type="radio" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} /> Thanh toán khi nhận hàng (COD)</label>
                      <label><input type="radio" checked={paymentMethod === "QR"} onChange={() => setPaymentMethod("QR")} /> Chuyển khoản qua QR</label>
                      {paymentMethod === "QR" && (
                        <div style={{ marginTop: 12 }}>
                          <img
                            alt="QR thanh toán"
                            width={160}
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`PAYMENT|${form.fullName}|${total}`)}`}
                          />
                        </div>
                      )}
                    </fieldset>

                    {/* Mã giảm giá */}
                    <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                      <legend style={{ padding: "0 6px" }}>Mã giảm giá</legend>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} placeholder="Nhập mã giảm giá" />
                        <button type="button" onClick={handleApplyVoucher}>Áp dụng</button>
                      </div>
                      {selectedVoucher && (
                        <p style={{ marginTop: 6, color: "#16a34a", fontSize: 13 }}>
                          ✅ Đã áp dụng: {selectedVoucher.label}
                        </p>
                      )}
                    </fieldset>
                  </div>

                  <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting || noneChecked}>
                      {noneChecked ? "Chọn sản phẩm để thanh toán" : "Thanh toán"}
                    </button>
                    <Link to="/cart" className="btn btn-outline">Quay lại giỏ hàng</Link>
                  </div>
                </form>
              </section>

              {/* --- Tóm tắt đơn hàng --- */}
              <aside style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, height: "fit-content" }}>
                <h3 style={{ marginTop: 0 }}>Tóm tắt đơn hàng</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 300, overflowY: "auto" }}>
                  {selectedItems.map((it) => (
                    <li key={it.id} style={{ borderBottom: "1px dashed #ddd", padding: "6px 0" }}>
                      <div>{it.name} × {it.quantity}</div>
                      <div style={{ fontSize: 13, color: "#667" }}>
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(it.price)}
                      </div>
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: "1px solid #ddd", marginTop: 12, paddingTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Tạm tính:</span> <span>{subtotal.toLocaleString()}đ</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Phí ship:</span> <span>{shippingFee.toLocaleString()}đ</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a" }}>
                      <span>Giảm giá:</span> <span>-{discount.toLocaleString()}đ</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginTop: 8 }}>
                    <span>Tổng cộng:</span> <span>{total.toLocaleString()}đ</span>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}