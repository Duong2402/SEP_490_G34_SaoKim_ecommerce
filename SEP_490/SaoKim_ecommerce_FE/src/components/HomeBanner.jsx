function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0); // 0 = hero, 1..n = banner

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const payload = await fetchJson(`${API_BASE}/api/banner`);
        if (cancelled) return;

        let list = [];
        if (Array.isArray(payload)) list = payload;
        else if (payload?.items) list = payload.items;

        const normalized = (list || []).map((b) => ({
          id: b.id ?? b.Id,
          title: b.title ?? b.Title ?? "",
          imageUrl: b.imageUrl ?? b.ImageUrl ?? "",
          linkUrl: b.linkUrl ?? b.LinkUrl ?? "",
          isActive:
            b.isActive !== undefined
              ? b.isActive
              : b.IsActive !== undefined
              ? b.IsActive
              : true,
        }));

        const active = normalized.filter((x) => x.isActive && x.imageUrl);
        setBanners(active);
      } catch {
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

  // tổng số slide = 1 hero + số banner
  const totalSlides = 1 + (banners?.length || 0);

  useEffect(() => {
    if (totalSlides <= 1) return; // chỉ hero hoặc chỉ 1 slide thì khỏi auto chạy

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(timer);
  }, [totalSlides]);

  // slide hiện tại
  const currentIsHero = index === 0;
  const currentBanner = !currentIsHero && banners[index - 1];

  return (
    <section className="home-hero">
      <div className="home-container" style={{ position: "relative" }}>
        {currentIsHero || loading || !banners.length ? (
          // hero slide
          <HeroBlock />
        ) : (
          // banner slide
          <div
            className="home-banner__media"
            style={{
              width: "100%",
              maxHeight: "420px",
              overflow: "hidden",
              position: "relative",
              marginBottom: "24px",
              borderRadius: "16px",
            }}
          >
            <a href={currentBanner.linkUrl || "#"} style={{ display: "block" }}>
              <img
                src={buildImageUrl(currentBanner.imageUrl)}
                alt={currentBanner.title || "Homepage banner"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </a>

            {currentBanner.title && (
              <div
                style={{
                  position: "absolute",
                  left: "24px",
                  bottom: "24px",
                  background: "rgba(0,0,0,0.45)",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  maxWidth: "60%",
                  fontSize: "15px",
                  lineHeight: 1.4,
                }}
              >
                {currentBanner.title}
              </div>
            )}
          </div>
        )}

        {/* dots cho hero + banners */}
        {totalSlides > 1 && (
          <div
            style={{
              position: "absolute",
              right: "18px",
              bottom: "18px",
              display: "flex",
              gap: "6px",
            }}
          >
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: i === index ? "#fff" : "rgba(255,255,255,0.5)",
                }}
                aria-label={i === 0 ? "Hero" : `Banner ${i}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
