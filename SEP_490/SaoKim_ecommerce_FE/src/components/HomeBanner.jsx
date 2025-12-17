import { useEffect, useState } from "react";
import http from "../api/http";

const FALLBACK_IMAGE =
  "https://luxlightdesigns.com/images/slider/1.webp?auto=format&fit=crop&q=80&w=1600";


const API_BASE = import.meta.env.VITE_API_BASE || "";
console.log("VITE_API_BASE =", API_BASE);

function buildImageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const path = url.startsWith("/") ? url : `/${url}`;

  // Nếu có API_BASE thì prefix để tải ảnh từ BE
  // Nếu không có (prod cùng domain) thì giữ nguyên path
  return API_BASE ? `${API_BASE}${path}` : path;
}

export default function HomeBanner({
  height = 520,
  fallbackImage = FALLBACK_IMAGE,
  autoMs = 5000,
}) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const payload = await http.get("/banner/active");
        if (cancelled) return;

        const list = Array.isArray(payload) ? payload : payload?.items || [];
        const normalized = (list || [])
          .map((b) => ({
            id: b.id,
            title: b.title || "",
            imageUrl: b.imageUrl || "",
            linkUrl: b.linkUrl || "",
          }))
          .filter((x) => x.imageUrl);

        setBanners(normalized);
      } catch (e) {
        console.error("Load banner failed", e);
        setBanners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = banners.length
    ? banners
    : [{ id: "fallback", title: "", imageUrl: fallbackImage, linkUrl: "" }];

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), autoMs);
    return () => clearInterval(t);
  }, [slides.length, autoMs]);

  const current = slides[index] || slides[0];

  return (
    <div
      style={{
        width: "100%",
        height,
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        background: "#f3f3f3",
      }}
    >
      {!loading && (
        <>
          {current.linkUrl ? (
            <a
              href={current.linkUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", width: "100%", height: "100%" }}
            >
              <img
                src={buildImageUrl(current.imageUrl)}
                alt={current.title || "Banner"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </a>
          ) : (
            <img
              src={buildImageUrl(current.imageUrl)}
              alt={current.title || "Banner"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          )}

          {!!current.title && (
            <div
              style={{
                position: "absolute",
                left: 18,
                bottom: 18,
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: 10,
                maxWidth: "70%",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              {current.title}
            </div>
          )}

          {slides.length > 1 && (
            <div style={{ position: "absolute", right: 18, bottom: 18, display: "flex", gap: 6 }}>
              {slides.map((_, i) => (
                <button
                  key={String(slides[i].id ?? i)}
                  type="button"
                  onClick={() => setIndex(i)}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    background: i === index ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                  aria-label={`Banner ${i}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
