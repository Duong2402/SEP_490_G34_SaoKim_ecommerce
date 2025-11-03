import { useEffect, useMemo, useState, memo } from "react";
import { Link, useParams } from "react-router-dom";
import EcommerceHeader from "../../components/EcommerceHeader";
import "../../styles/product-detail.css";

let API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";
if (API_BASE.endsWith("/")) API_BASE = API_BASE.slice(0, -1);

const FALLBACK_IMAGE = "https://via.placeholder.com/800x600?text=No+Image";

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, opts);
  const text = await response.text();
  if (!response.ok) throw new Error(text || response.statusText);
  return text ? JSON.parse(text) : null;
}

function buildImageUrl(pathOrFile) {
  if (!pathOrFile) return FALLBACK_IMAGE;
  if (pathOrFile.startsWith("http://") || pathOrFile.startsWith("https://")) return pathOrFile;
  const relative = pathOrFile.startsWith("/") ? pathOrFile : `/${pathOrFile}`;
  return `${API_BASE}${relative}`;
}

function formatCurrency(value) {
  const numeric = Number(value || 0);
  if (!numeric) return "Contact for pricing";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(numeric);
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
    return { product: payload, related: payload.related ?? payload.relatedProducts ?? [] };
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
    return source.map((item) => (typeof item === "string" ? item : item?.label ?? item?.name));
  }
  if (typeof source === "string") {
    return source
      .split(/\n|\u2022|-/u)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const RelatedProductCard = memo(function RelatedProductCard({ product }) {
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const imageUrl = buildImageUrl(product.image || product.thumbnailUrl);

  return (
    <Link to={`/products/${product.id}`} className="product-related-card">
      <div className="product-related-card__media">
        <img
          src={imageError ? FALLBACK_IMAGE : imageUrl}
          alt={product.name || "San pham"}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      </div>
      <div className="product-related-card__body">
        <div className="product-related-card__title">{product.name || "San pham"}</div>
        <div className="product-related-card__price">{formatCurrency(product.price)}</div>
      </div>
    </Link>
  );
}, (prevProps, nextProps) => {
  if (!prevProps.product || !nextProps.product) return false;
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.image === nextProps.product.image
  );
});

RelatedProductCard.displayName = "RelatedProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ product: null, related: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authState, setAuthState] = useState({ isLoggedIn: false, name: "" });
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [mainImageError, setMainImageError] = useState(false);

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
        if (!cancelled) setError(err.message || "Unable to load product information");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName") || "";
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
  const specifications = useMemo(() => normalizeSpecifications(product), [product]);
  const highlights = useMemo(() => pickHighlights(product), [product]);
  const relatedProducts = Array.isArray(data.related) ? data.related : [];

  const quickFacts = useMemo(() => {
    if (!product) return [];
    return [
      {
        label: "Product code",
        value: product.code || product.sku || product.productCode || "-",
      },
      {
        label: "Category",
        value: product.category || product.categoryName || "Updating",
      },
      {
        label: "Inventory",
        value:
          typeof product.quantity === "number"
            ? `${product.quantity} items`
            : product.stockStatus || "Contact us",
      },
      {
        label: "Warranty",
        value: product.warranty || "12 months standard",
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
    !mainImageError && gallery[activeImageIndex] ? gallery[activeImageIndex] : FALLBACK_IMAGE;

  const renderStatus = (message) => (
    <div className="product-detail-page">
      <EcommerceHeader />
      <main className="product-detail-main">
        <div className="product-detail-container">
          <div className="product-detail-status">{message}</div>
        </div>
      </main>
    </div>
  );

  if (loading) return renderStatus("Loading product details...");
  if (error) return renderStatus(`Something went wrong: ${error}`);
  if (!product) return renderStatus("Product not found.");

  return (
    <div className="product-detail-page">
      <EcommerceHeader />
      <main className="product-detail-main">
        <div className="product-detail-container">
          <section className="product-detail-hero">
            <div className="product-detail-breadcrumbs">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/#catalog">Product catalogue</Link>
              <span>/</span>
              <span>{product.name || "San pham"}</span>
            </div>
            <div className="product-detail-hero__content">
              <h1>{product.name || "San pham"}</h1>
              <p>{heroSummary}</p>
              <div className="product-detail-hero__meta">
                <span className="product-detail-hero__badge">Authentic product</span>
                {product.brand && <span className="product-detail-hero__badge">Brand: {product.brand}</span>}
                {product.category && (
                  <span className="product-detail-hero__badge">Category: {product.category}</span>
                )}
              </div>
            </div>
          </section>

          <div className="product-detail-grid">
            <div className="product-gallery">
              <div className="product-gallery__main">
                <img
                  src={activeImage}
                  alt={product.name || "San pham"}
                  onError={() => setMainImageError(true)}
                />
              </div>
              {gallery.length > 1 && (
                <div className="product-gallery__thumbs">
                  {gallery.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      className={`product-gallery__thumb${index === activeImageIndex ? " is-active" : ""}`}
                      onClick={() => setActiveImageIndex(index)}
                    >
                      <img src={image} alt={`View image ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="product-info">
              <div>
                <div className="product-info__price">{formatCurrency(product.price)}</div>
                <div className="product-info__stock">
                  {typeof product.quantity === "number" && product.quantity > 0 ? (
                    <>
                      <i className="fa-solid fa-circle-check" aria-hidden="true" />
                      <span>In stock</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                      <span>Contact us for stock availability</span>
                    </>
                  )}
                </div>
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

              <div className="product-info__cta">
                {authState.isLoggedIn ? (
                  <>
                    <button type="button" className="btn btn-primary product-info__cta-primary">
                      Add to cart
                    </button>
                    <a className="btn btn-outline product-info__cta-secondary" href="tel:0918113559">
                      Lighting consultation
                    </a>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="btn btn-primary product-info__cta-primary">
                      Sign in to purchase
                    </Link>
                    <a className="btn btn-outline product-info__cta-secondary" href="tel:0918113559">
                      Call 0918 113 559
                    </a>
                  </>
                )}
              </div>

              <div className="product-info__service">
                <span>
                  <i className="fa-solid fa-truck-fast" aria-hidden="true" />
                  Nationwide delivery within 2-4 days
                </span>
                <span>
                  <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                  7-day return policy for manufacturing faults
                </span>
                <span>
                  <i className="fa-solid fa-lightbulb" aria-hidden="true" />
                  Complimentary lighting design consultation
                </span>
              </div>
            </div>
          </div>

          {descriptionParagraphs.length > 0 && (
            <section className="product-description">
              <h3>Product details</h3>
              {descriptionParagraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </section>
          )}

          {!!specifications.length && (
            <section className="product-specs">
              <h3>Specifications</h3>
              <dl className="product-specs__list">
                {specifications.map((spec) => (
                  <div className="product-specs__row" key={`${spec.label}-${spec.value}`}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {relatedProducts.length > 0 && (
            <section className="product-related">
              <div className="product-related__header">
                <h3>Related products</h3>
                <Link to="/#catalog">Browse catalogue</Link>
              </div>
              <div className="product-related__grid">
                {relatedProducts.slice(0, 6).map((related) => (
                  <RelatedProductCard key={related.id} product={related} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
