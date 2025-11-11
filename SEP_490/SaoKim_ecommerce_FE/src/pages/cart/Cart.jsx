import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EcommerceHeader from "../../components/EcommerceHeader";

function readCart() {
  try {
    const raw = localStorage.getItem("cartItems");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  const normalized = Array.isArray(items) ? items : [];
  localStorage.setItem("cartItems", JSON.stringify(normalized));
  const totalQty = normalized.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  localStorage.setItem("cartCount", String(totalQty));
  window.dispatchEvent(new Event("localStorageChange"));
}

export default function Cart() {
  const [items, setItems] = useState(() => readCart());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const navigate = useNavigate();
  const clickLockRef = useRef(new Set());
  const lastClickAtRef = useRef(new Map());

  useEffect(() => {
    const sync = () => setItems(readCart());
    window.addEventListener("storage", sync);
    window.addEventListener("localStorageChange", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("localStorageChange", sync);
    };
  }, []);

  const total = useMemo(() => {
    return items
      .filter((it) => selectedIds.has(it.id))
      .reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  }, [items, selectedIds]);

  const updateQty = (productId, delta) => {
    setItems((prev) => {
      const next = prev.map((it) => {
        if (it.id !== productId) return it;
        const current = Number(it.quantity) || 1;
        let nextQty = current + delta;
        if (nextQty < 1) nextQty = 1;
        return { ...it, quantity: nextQty };
      });
      writeCart(next);
      return next;
    });
  };

  const throttledUpdate = (productId, delta) => {
    const locks = clickLockRef.current;
    const now = Date.now();
    const lastClickAt = lastClickAtRef.current.get(productId) || 0;
    if (locks.has(productId)) return;
    if (now - lastClickAt < 200) return;
    lastClickAtRef.current.set(productId, now);
    locks.add(productId);
    try {
      updateQty(productId, delta);
    } finally {
      setTimeout(() => {
        locks.delete(productId);
      }, 180);
    }
  };

  const removeItem = (productId) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== productId);
      writeCart(next);
      const newSelected = new Set(selectedIds);
      newSelected.delete(productId);
      setSelectedIds(newSelected);
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((it) => it.id)));
  };

  const proceedCheckout = () => {
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
      return;
    }
    localStorage.setItem("checkoutItems", JSON.stringify(selectedItems));
    navigate("/checkout");
  };

  return (
    <div className="cart-page">
      <EcommerceHeader />
      <main className="cart-main" style={{ padding: 24 }}>
        <div className="cart-container" style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h1 style={{ marginBottom: 16 }}>Giỏ hàng</h1>
          {items.length === 0 ? (
            <div>
              <p>Giỏ hàng trống.</p>
              <Link to="/" className="btn btn-primary">Tiếp tục mua sắm</Link>
            </div>
          ) : (
            <div className="cart-grid" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
              <section>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={selectAll}
                    />
                    <span>Chọn tất cả ({items.length})</span>
                  </label>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {items.map((it) => (
                    <li key={it.id} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: "1px solid #eee" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(it.id)}
                        onChange={() => toggleSelect(it.id)}
                        style={{ alignSelf: "center" }}
                      />
                      <img src={it.image} alt={it.name} style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 8 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div style={{ color: "#667", fontSize: 14 }}>Mã: {it.code || it.sku || it.id}</div>
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                          <button type="button" className="btn btn-outline btn-small" disabled={Number(it.quantity) <= 1} onClick={() => throttledUpdate(it.id, -1)}>-</button>
                          <span style={{ minWidth: 28, textAlign: "center" }}>{it.quantity}</span>
                          <button type="button" className="btn btn-outline btn-small" onClick={() => throttledUpdate(it.id, +1)}>+</button>
                          <button type="button" className="btn btn-outline btn-small" onClick={() => removeItem(it.id)} style={{ marginLeft: 12 }}>Xóa</button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
                          (Number(it.price) || 0) * (Number(it.quantity) || 0)
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <aside style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, height: "fit-content" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Tạm tính ({selectedIds.size} sản phẩm)</span>
                  <strong>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(total)}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, color: "#667" }}>
                  <span>Phí vận chuyển</span>
                  <span>Tính ở bước sau</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  onClick={proceedCheckout}
                >
                  Tiến hành thanh toán
                </button>
                <Link to="/" className="btn btn-outline" style={{ width: "100%", marginTop: 8 }}>
                  Tiếp tục mua sắm
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
