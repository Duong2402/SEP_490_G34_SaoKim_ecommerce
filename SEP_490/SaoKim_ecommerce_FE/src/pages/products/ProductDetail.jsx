import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Toast, ToastContainer } from "react-bootstrap";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import ProductCard from "../../components/products/ProductCard";
import "../../styles/product-detail.css";

let API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "";
if (API_BASE.endsWith("/")) API_BASE = API_BASE.slice(0, -1);

const FALLBACK_IMAGE = "https://via.placeholder.com/800x600?text=No+Image";

function getCartOwnerKey() {
  if (typeof window === "undefined") return "guest";
  const email = localStorage.getItem("userEmail");
  const name = localStorage.getItem("userName");
  return (email || name || "guest").toString();
}

function getCartKeys() {
  const owner = getCartOwnerKey();
  return {
    itemsKey: `cartItems_${owner}`,
    countKey: `cartCount_${owner}`,
    checkoutKey: `checkoutItems_${owner}`,
  };
}

function readCart() {
  try {
    const { itemsKey } = getCartKeys();
    const raw = localStorage.getItem(itemsKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  const normalized = Array.isArray(items) ? items : [];
  const { itemsKey, countKey } = getCartKeys();

  localStorage.setItem(itemsKey, JSON.stringify(normalized));

  const totalQty = normalized.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );
  localStorage.setItem(countKey, String(totalQty));

  window.dispatchEvent(new Event("localStorageChange"));
}

function addToCartFromProduct(product, quantity = 1) {
  if (!product) return;
  const cart = readCart();
  const idx = cart.findIndex((it) => it.id === product.id);

  if (idx >= 0) {
    const currentQty = Number(cart[idx].quantity) || 0;
    cart[idx] = {
      ...cart[idx],
      quantity: currentQty + quantity,
    };
  } else {
    cart.push({
      id: product.id,
      name: product.name || "San pham",
      price: Number(product.price) || 0,
      image: (product.image || product.thumbnailUrl) ?? "",
      code: product.code || product.sku || product.productCode,
      quantity: quantity,
    });
  }

  writeCart(cart);
}

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, opts);
  const text = await response.text();
  if (!response.ok) throw new Error(text || response.statusText);
  return text ? JSON.parse(text) : null;
}

function buildImageUrl(pathOrFile) {
  if (!pathOrFile) return FALLBACK_IMAGE;
  if (pathOrFile.startsWith("http://") || pathOrFile.startsWith("https://"))
    return pathOrFile;
  const relative = pathOrFile.startsWith("/") ? pathOrFile : `/${pathOrFile}`;
  return `${API_BASE}${relative}`;
}

function formatCurrency(value) {
  const numeric = Number(value || 0);
  if (!numeric) return "Contact for pricing";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(numeric);
}

function adaptProductResponse(payload) {
  if (!payload) {
    return { product: null, related: [] };
  }
  if (payload.product || payload.related || payload.relatedProducts) {
    return {
      product: payload.product ?? null,
      related: payload.related ?? payload.relatedProducts ?? [],
    };
  }
  if (payload.data?.product || payload.data?.related) {
    return {
      product: payload.data.product ?? null,
      related: payload.data.related ?? [],
    };
  }
  if (payload.id || payload.name) {
    return {
      product: payload,
      related: payload.related ?? payload.relatedProducts ?? [],
    };
  }
  return { product: null, related: [] };
}

function buildGallery(product) {
  if (!product) return [FALLBACK_IMAGE];
  const collected = [];
  const push = (value) => {
    if (!value) return;
    const url = buildImageUrl(value);
    if (!collected.includes(url)) collected.push(url);
  };

  push(product.image);
  push(product.thumbnailUrl);

  if (Array.isArray(product.images)) {
    product.images.forEach((item) => {
      if (typeof item === "string") push(item);
      else if (item?.url) push(item.url);
      else if (item?.path) push(item.path);
    });
  }

  if (Array.isArray(product.gallery)) {
    product.gallery.forEach((item) => {
      if (typeof item === "string") push(item);
      else if (item?.url) push(item.url);
    });
  }

  return collected.length ? collected : [FALLBACK_IMAGE];
}

function normalizeSpecifications(product) {
  if (!product) return [];
  const source =
    product.specifications ||
    product.attributes ||
    product.details ||
    product.technicalSpecifications;
  if (!source) return [];

  if (Array.isArray(source)) {
    return source
      .map((item) => ({
        label: item?.label ?? item?.name ?? item?.key ?? "",
        value: item?.value ?? item?.content ?? item?.detail ?? "",
      }))
      .filter((item) => item.label && item.value);
  }

  if (typeof source === "object") {
    return Object.entries(source)
      .map(([label, value]) => ({
        label,
        value: Array.isArray(value) ? value.join(", ") : value,
      }))
      .filter(
        (item) =>
          item.label &&
          item.value !== undefined &&
          item.value !== null &&
          String(item.value).trim().length
      );
  }

  return [];
}

function pickHighlights(product) {
  if (!product) return [];
  const source = product.highlights || product.features || product.tags;
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.map((item) =>
      typeof item === "string" ? item : item?.label ?? item?.name
    );
  }
  if (typeof source === "string") {
    return source
      .split(/\n|\u2022|-/u)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export default function ProductDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ product: null, related: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    name: "",
  });
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [mainImageError, setMainImageError] = useState(false);
  const [reviews, setReviews] = useState({
    items: [],
    averageRating: 0,
    count: 0,
  });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewError, setReviewError] = useState("");
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const url = `${API_BASE}/api/products/${id}`;

    fetchJson(url)
      .then((payload) => {
        if (cancelled) return;
        setData(adaptProductResponse(payload));
      })
      .catch((err) => {
        if (!cancelled)
          setError(err.message || "Unable to load product information");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    setReviewError("");
    setReviews({ items: [], averageRating: 0, count: 0 });

    const url = `${API_BASE}/api/products/${id}/reviews`;
    fetchJson(url)
      .then((payload) => {
        if (cancelled) return;
        const items = Array.isArray(payload?.items) ? payload.items : [];
        setReviews({
          items,
          averageRating: Number(payload?.averageRating || 0),
          count: Number(payload?.count || items.length || 0),
        });
      })
      .catch((err) => {
        if (!cancelled)
          setReviewError(err.message || "Unable to load reviews");
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      const name =
        localStorage.getItem("userName") ||
        localStorage.getItem("userEmail") ||
        "";
      const isLoggedIn = Boolean(token && name);
      setAuthState((prev) => {
        if (prev.isLoggedIn === isLoggedIn && prev.name === name) return prev;
        return { isLoggedIn, name };
      });
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener("localStorageChange", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("localStorageChange", syncAuth);
    };
  }, []);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [data?.product?.id]);

  useEffect(() => {
    setMainImageError(false);
  }, [activeImageIndex, data?.product?.id]);

  const product = data.product;
  const gallery = useMemo(() => buildGallery(product), [product]);
  const specifications = useMemo(
    () => normalizeSpecifications(product),
    [product]
  );
  const highlights = useMemo(() => pickHighlights(product), [product]);
  const relatedProducts = Array.isArray(data.related) ? data.related : [];

  const quickFacts = useMemo(() => {
    if (!product) return [];
    return [
      {
        label: "Mã sản phẩm",
        value: product.code || product.sku || product.productCode || "-",
      },
      {
        label: "Danh mục",
        value: product.category || product.categoryName || "Đang cập nhật",
      },
      {
        label: "Tồn kho",
        value:
          typeof product.quantity === "number"
            ? `${product.quantity} sản phẩm`
            : product.stockStatus || "Liên hệ",
      },
      {
        label: "Bảo hành",
        value: product.warranty || "12 tháng",
      },
    ].filter((item) => item.value);
  }, [product]);

  const descriptionParagraphs = useMemo(() => {
    if (!product?.description) return [];
    return String(product.description)
      .split(/\n{2,}|\r\n\r\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [product]);

  const heroSummary = useMemo(() => {
    if (!product) return "";
    if (product.summary) return product.summary;
    if (product.shortDescription) return product.shortDescription;
    if (product.description) {
      const firstSentence = product.description.split(".")[0];
      return firstSentence.length > 160
        ? `${firstSentence.slice(0, 157)}...`
        : firstSentence;
    }
    return "Lighting solutions tailored for modern spaces.";
  }, [product]);

  const activeImage =
    !mainImageError && gallery[activeImageIndex]
      ? gallery[activeImageIndex]
      : FALLBACK_IMAGE;

  const renderStatus = (message) => (
    <div className="product-detail-page">
      <HomepageHeader />
      <main className="product-detail-main">
        <div className="container product-detail-container">
          <div className="product-detail-status">{message}</div>
        </div>
      </main>
      <EcommerceFooter />
    </div>
  );

  const handleQtyChange = (delta) => {
    setQuantity((prev) => {
      const next = Math.max(1, (Number(prev) || 1) + delta);
      return next;
    });
  };

  const handleAddToCart = () => {
    addToCartFromProduct(product, quantity);
    setShowToast(true);
  };

  if (loading) return renderStatus("Đang tải thông tin sản phẩm...");
  if (error) return renderStatus(`Có lỗi xảy ra: ${error}`);
  if (!product) return renderStatus("Không tìm thấy sản phẩm.");

  return (
    <div className="product-detail-page">
      <HomepageHeader />
      <main className="product-detail-main">
        <div className="container product-detail-container">
          <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1060 }}>
            <Toast
              bg="success"
              show={showToast}
              autohide
              delay={2000}
              onClose={() => setShowToast(false)}
            >
              <Toast.Body className="text-white">Đã thêm vào giỏ</Toast.Body>
            </Toast>
          </ToastContainer>

          <section className="product-detail-hero card-section">
            <div className="product-detail-breadcrumbs">
              <Link to="/">Trang chủ</Link>
              <span>/</span>
              <Link to="/products">Sản phẩm</Link>
              <span>/</span>
              <span>{product.name || "Sản phẩm"}</span>
            </div>
            <h1 className="product-detail-title">{product.name || "Sản phẩm"}</h1>
            <p className="product-detail-subtitle">
              {heroSummary || "Giải pháp chiếu sáng tinh tế cho mọi không gian."}
            </p>
          </section>

          <div className="product-detail-grid row g-4">
            <div className="col-lg-6">
              <div className="product-card gallery-card">
                <div className="product-gallery__main">
                  <img
                    src={activeImage}
                    alt={product.name || "Sản phẩm"}
                    onError={() => setMainImageError(true)}
                  />
                </div>
                {gallery.length > 1 && (
                  <div className="product-gallery__thumbs">
                    {gallery.map((image, index) => (
                      <button
                        type="button"
                        key={image}
                        className={`product-gallery__thumb${
                          index === activeImageIndex ? " is-active" : ""
                        }`}
                        onClick={() => setActiveImageIndex(index)}
                      >
                        <img src={image} alt={`Xem ảnh ${index + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="col-lg-6">
              <div className="product-card info-card">
                <div className="product-info__price text-accent">
                  {formatCurrency(product.price)}
                </div>
                <div className="product-info__stock">
                  {typeof product.quantity === "number" && product.quantity > 0 ? (
                    <>
                      <i className="fa-solid fa-circle-check" aria-hidden="true" />
                      <span>Còn hàng</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                      <span>Liên hệ để kiểm tra tồn kho</span>
                    </>
                  )}
                </div>

                {!!quickFacts.length && (
                  <dl className="product-info__facts">
                    {quickFacts.map((item) => (
                      <div className="product-info__fact" key={`${item.label}-${item.value}`}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {highlights.length > 0 && (
                  <ul className="product-info__highlights">
                    {highlights.slice(0, 4).map((highlight, index) => (
                      <li key={index}>{highlight}</li>
                    ))}
                  </ul>
                )}

                <div className="product-qty">
                  <span className="text-muted">Số lượng</span>
                  <div className="product-qty-controls">
                    <button type="button" onClick={() => handleQtyChange(-1)} disabled={quantity <= 1}>
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    />
                    <button type="button" onClick={() => handleQtyChange(1)}>
                      +
                    </button>
                  </div>
                </div>

                <div className="product-info__cta">
                  {authState.isLoggedIn ? (
                    <>
                      <button
                        type="button"
                        className="btn brand-primary product-info__cta-primary"
                        onClick={handleAddToCart}
                      >
                        Thêm vào giỏ
                      </button>
                      <a className="btn btn-outline-light product-info__cta-secondary" href="tel:0918113559">
                        Nhận tư vấn chiếu sáng
                      </a>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="btn brand-primary product-info__cta-primary">
                        Đăng nhập để mua hàng
                      </Link>
                      <a className="btn btn-outline-light product-info__cta-secondary" href="tel:0918113559">
                        Liên hệ 0918 113 559
                      </a>
                    </>
                  )}
                </div>

                <div className="product-info__service">
                  <span>
                    <i className="fa-solid fa-truck-fast" aria-hidden="true" />
                    Giao hàng toàn quốc
                  </span>
                  <span>
                    <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                    Đổi trả trong 7 ngày nếu lỗi sản xuất
                  </span>
                  <span>
                    <i className="fa-solid fa-lightbulb" aria-hidden="true" />
                    Tư vấn thiết kế chiếu sáng miễn phí
                  </span>
                </div>
              </div>
            </div>
          </div>

          {descriptionParagraphs.length > 0 && (
            <section className="product-section">
              <div className="product-card">
                <h3 className="section-title">Mô tả sản phẩm</h3>
                {descriptionParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}

          {!!specifications.length && (
            <section className="product-section">
              <div className="product-card">
                <h3 className="section-title">Thông số kỹ thuật</h3>
                <dl className="product-specs__list">
                  {specifications.map((spec) => (
                    <div className="product-specs__row" key={`${spec.label}-${spec.value}`}>
                      <dt>{spec.label}</dt>
                      <dd>{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {relatedProducts.length > 0 && (
            <section className="product-section">
              <div className="product-card">
                <div className="product-section-header">
                  <h3 className="section-title mb-0">Sản phẩm liên quan</h3>
                  <Link to="/products" className="text-decoration-none fw-semibold">
                    Xem thêm
                  </Link>
                </div>
                <div className="row g-4">
                  {relatedProducts.slice(0, 4).map((related) => (
                    <div className="col-md-6 col-lg-3" key={related.id}>
                      <ProductCard
                        product={{
                          id: related.id,
                          name: related.name,
                          price: related.price,
                          image: related.thumbnailUrl || related.image || related.imageUrl,
                          category: related.category,
                        }}
                        onView={() => (window.location.href = `/products/${related.id}`)}
                        formatPrice={formatCurrency}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="product-section">
            <div className="product-card">
              <h3 className="section-title">Đánh giá của khách hàng</h3>
              {reviewsLoading ? (
                <div>Đang tải đánh giá...</div>
              ) : reviewError ? (
                <div className="text-danger">{reviewError}</div>
              ) : (
                <>
                  <div className="product-reviews__summary">
                    <strong>Điểm trung bình:</strong> {reviews.averageRating} / 5 ({reviews.count} đánh giá)
                  </div>
                  <ul className="product-reviews__list">
                    {reviews.items.length === 0 && <li>Chưa có đánh giá nào.</li>}
                    {reviews.items.map((r) => (
                      <li key={r.id} className="product-reviews__item">
                        <div className="product-reviews__item-head">
                          <span className="product-reviews__user">{r.userName || "Khách hàng"}</span>
                          <span className="product-reviews__rating">
                            {"★".repeat(r.rating)}
                            {"☆".repeat(5 - r.rating)}
                          </span>
                        </div>
                        {r.comment && <div className="product-reviews__comment">{r.comment}</div>}
                        <div className="product-reviews__date">{new Date(r.createdAt).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {authState.isLoggedIn ? (
                <form
                  className="product-reviews__form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (submittingReview) return;
                    setSubmittingReview(true);
                    const token = localStorage.getItem("token");
                    try {
                      const res = await fetch(`${API_BASE}/api/products/${id}/reviews`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          rating: Number(reviewForm.rating),
                          comment: reviewForm.comment,
                        }),
                      });
                      const text = await res.text();
                      if (!res.ok) throw new Error(text || res.statusText);
                      const payload = text ? JSON.parse(text) : { items: [] };
                      const items = Array.isArray(payload?.items) ? payload.items : [];
                      setReviews({
                        items,
                        averageRating: Number(payload?.averageRating || 0),
                        count: Number(payload?.count || items.length || 0),
                      });
                      setReviewForm({ rating: 5, comment: "" });
                    } catch (err) {
                      alert(err.message || "Không thể gửi đánh giá");
                    } finally {
                      setSubmittingReview(false);
                    }
                  }}
                >
                  <div className="form-group">
                    <label htmlFor="rating">Đánh giá của bạn</label>
                    <select
                      id="rating"
                      className="form-control"
                      value={reviewForm.rating}
                      onChange={(e) =>
                        setReviewForm((s) => ({
                          ...s,
                          rating: e.target.value,
                        }))
                      }
                    >
                      {[5, 4, 3, 2, 1].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="comment">Chia sẻ trải nghiệm</label>
                    <textarea
                      id="comment"
                      className="form-control"
                      rows={3}
                      maxLength={1000}
                      placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này"
                      value={reviewForm.comment}
                      onChange={(e) =>
                        setReviewForm((s) => ({
                          ...s,
                          comment: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <button type="submit" className="btn brand-primary" disabled={submittingReview}>
                    {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                  </button>
                </form>
              ) : (
                <div className="product-reviews__signin">
                  <Link to="/login">Đăng nhập</Link> để viết đánh giá.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <EcommerceFooter />
    </div>
  );
}

