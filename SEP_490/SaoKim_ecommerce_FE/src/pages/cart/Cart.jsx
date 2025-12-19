import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import { readCart, writeCart, getCartKeys } from "../../api/cartStorage.js";
import { ProductsAPI } from "../../api/products";
import "../../styles/cart.css";

export default function Cart() {
  const [items, setItems] = useState(() => readCart());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [qtyInputs, setQtyInputs] = useState({});
  const navigate = useNavigate();
  const clickLockRef = useRef(new Set());
  const lastClickAtRef = useRef(new Map());
  const priceUpdateRef = useRef(false); // Tránh gọi API liên tục

  useEffect(() => {
    const sync = () => {
      const cart = readCart();
      setItems(cart);
      setSelectedIds(new Set());
    };

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("localStorageChange", sync);
    window.addEventListener("auth:changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("localStorageChange", sync);
      window.removeEventListener("auth:changed", sync);
    };
  }, []);

  // Cập nhật giá khuyến mãi realtime từ API
  useEffect(() => {
    if (items.length === 0 || priceUpdateRef.current) return;

    const productIds = items.map((it) => Number(it.id)).filter(Boolean);
    if (productIds.length === 0) return;

    priceUpdateRef.current = true;

    ProductsAPI.getPrices(productIds)
      .then((res) => {
        const prices = res?.data ?? res ?? [];
        if (!Array.isArray(prices) || prices.length === 0) return;

        const priceMap = new Map(prices.map((p) => [p.productId, p.price]));

        setItems((prev) => {
          let hasChanges = false;
          const updated = prev.map((it) => {
            const newPrice = priceMap.get(Number(it.id));
            if (newPrice !== undefined && newPrice !== it.price) {
              hasChanges = true;
              return { ...it, price: newPrice };
            }
            return it;
          });

          if (hasChanges) {
            writeCart(updated);
            return updated;
          }
          return prev;
        });
      })
      .catch((err) => {
        console.error("Failed to update promo prices:", err);
      })
      .finally(() => {
        // Cho phép cập nhật lại sau 5 giây
        setTimeout(() => {
          priceUpdateRef.current = false;
        }, 5000);
      });
  }, [items.length]); // Chỉ chạy khi số lượng items thay đổi

  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set(items.map((it) => it.id));
      const next = new Set();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    setQtyInputs((prev) => {
      const next = {};
      items.forEach((it) => {
        const normalized = String(Number(it.quantity) || 1);
        next[it.id] =
          prev[it.id] != null && prev[it.id] === normalized ? prev[it.id] : normalized;
      });
      return next;
    });
  }, [items]);

  const total = useMemo(() => {
    return items
      .filter((it) => selectedIds.has(it.id))
      .reduce(
        (sum, it) =>
          sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
        0
      );
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

  const normalizeInputQty = (value) => {
    if (value == null || value === "") return null;
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return null;
    if (parsed < 1) return null;
    return Math.min(999, parsed);
  };

  const commitQtyInput = (productId) => {
    const currentItem = items.find((it) => it.id === productId);
    if (!currentItem) return;
    const currentQty = Number(currentItem.quantity) || 1;
    const nextQty = normalizeInputQty(qtyInputs[productId]);
    if (!nextQty) {
      setQtyInputs((prev) => ({ ...prev, [productId]: String(currentQty) }));
      return;
    }
    if (nextQty !== currentQty) {
      updateQty(productId, nextQty - currentQty);
    }
    setQtyInputs((prev) => ({ ...prev, [productId]: String(nextQty) }));
  };

  const handleQtyInputChange = (productId, value) => {
    if (value === "" || /^\d+$/.test(value)) {
      setQtyInputs((prev) => ({ ...prev, [productId]: value }));
    }
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

  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);

  const proceedCheckout = () => {
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
      return;
    }

    const { checkoutKey } = getCartKeys();
    localStorage.setItem(checkoutKey, JSON.stringify(selectedItems));

    navigate("/checkout");
  };

  return (
    <div className="cart-page">
      <HomepageHeader />
      <main className="cart-main">
        <div className="cart-hero container">
          <div className="breadcrumb-text">Trang chủ / Giỏ hàng</div>
          <h1 className="cart-title">Giỏ hàng</h1>
        </div>

        <div className="cart-container container">
          {items.length === 0 ? (
            <div className="empty-cart text-center">
              <div className="empty-cart-icon">🛒</div>
              <h3>Giỏ hàng của bạn đang trống</h3>
              <p className="text-muted">Hãy thêm sản phẩm để bắt đầu mua sắm.</p>
              <Link to="/products" className="btn btn-primary brand-primary">
                Xem sản phẩm
              </Link>
            </div>
          ) : (
            <div className="cart-grid">
              <section className="cart-items">
                <div className="cart-select-all">
                  <label className="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={selectAll}
                    />
                    <span className="fw-semibold">Chọn tất cả ({items.length})</span>
                  </label>
                  <div className="text-muted small">Đã chọn {selectedIds.size} sản phẩm</div>
                </div>

                <ul className="cart-item-list">
                  {items.map((it) => (
                    <li key={it.id} className="cart-item-card">
                      <div className="cart-item-left">
                        <input
                          type="checkbox"
                          className="form-check-input mt-1"
                          checked={selectedIds.has(it.id)}
                          onChange={() => toggleSelect(it.id)}
                        />
                        <div className="cart-item-thumb">
                          <img
                            src={it.image}
                            alt={it.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/placeholder-product.png";
                            }}
                          />
                        </div>
                        <div className="cart-item-info">
                          <div className="cart-item-name">{it.name}</div>
                          <div className="cart-item-meta">Mã: {it.code || it.sku || it.id}</div>
                        </div>
                      </div>

                      <div className="cart-item-right">
                        <div className="cart-item-price">
                          <span className="text-muted small">Đơn giá</span>
                          <strong>{formatCurrency(it.price)}</strong>
                        </div>

                        <div className="cart-item-qty">
                          <button
                            type="button"
                            className="qty-btn"
                            disabled={Number(it.quantity) <= 1}
                            onClick={() => throttledUpdate(it.id, -1)}
                          >
                            -
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="qty-input"
                            value={qtyInputs[it.id] ?? String(Number(it.quantity) || 1)}
                            onChange={(e) => handleQtyInputChange(it.id, e.target.value)}
                            onBlur={() => commitQtyInput(it.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitQtyInput(it.id);
                              }
                            }}
                          />
                          <button type="button" className="qty-btn" onClick={() => throttledUpdate(it.id, +1)}>
                            +
                          </button>
                        </div>

                        <div className="cart-item-subtotal">
                          <span className="text-muted small">Thành tiền</span>
                          <strong className="text-accent">
                            {formatCurrency((Number(it.price) || 0) * (Number(it.quantity) || 0))}
                          </strong>
                        </div>

                        <button type="button" className="cart-item-remove" onClick={() => removeItem(it.id)}>
                          Xóa
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <aside className="cart-summary">
                <div className="cart-summary-header">
                  <div>
                    <div className="summary-eyebrow">Tổng kết</div>
                    <h5 className="mb-1">Tạm tính</h5>
                  </div>
                  <div className="text-muted small">({selectedIds.size} sản phẩm)</div>
                </div>

                <div className="summary-row">
                  <span>Tạm tính</span>
                  <strong className="text-accent">{formatCurrency(total)}</strong>
                </div>
                <div className="summary-row">
                  <span>Phí vận chuyển</span>
                  <span className="text-muted">Tính ở bước sau</span>
                </div>

                <button
                  type="button"
                  className="btn brand-primary w-100"
                  disabled={selectedIds.size === 0}
                  onClick={proceedCheckout}
                >
                  Tiến hành thanh toán
                </button>
                {selectedIds.size === 0 && (
                  <div className="text-muted small mt-2">Vui lòng chọn sản phẩm để tiến hành thanh toán.</div>
                )}
                <Link to="/products" className="btn continue-btn w-100 mt-2">
                  Tiếp tục mua sắm
                </Link>
              </aside>
            </div>
          )}
        </div>
      </main>
      <EcommerceFooter />
    </div>
  );
}
