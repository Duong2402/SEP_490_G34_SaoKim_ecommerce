import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProvinces, getDistricts, getWards } from "sub-vn";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";
import "../../styles/account.css";

export default function Addresses() {
  const navigate = useNavigate();
  const apiBase = "https://localhost:7278";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form state (create/update)
  const [editing, setEditing] = useState(null); // null=create, number=id for edit
  const [form, setForm] = useState({
    recipientName: "",
    phoneNumber: "",
    line1: "",
    line2: "",
    ward: "",
    district: "",
    province: "",
    isDefault: false,
  });

  // selection state (lÆ°u code Ä‘á»ƒ Ä‘á»• danh sÃ¡ch phá»¥ thuá»™c)
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardCode, setWardCode] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Google Places loader (tÃ¹y chá»n)
  const { isLoaded: isGMapsLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });
  const enablePlaces = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(
    () => (provinceCode ? getDistricts(provinceCode) : []),
    [provinceCode]
  );
  const wards = useMemo(
    () => (districtCode ? getWards(districtCode) : []),
    [districtCode]
  );

  const findProvinceByName = (name) =>
    provinces.find((p) => p.name.toLowerCase() === (name || "").toLowerCase());
  const findDistrictByName = (provCode, name) =>
    getDistricts(provCode).find(
      (d) => d.name.toLowerCase() === (name || "").toLowerCase()
    );
  const findWardByName = (distCode, name) =>
    getWards(distCode).find(
      (w) => w.name.toLowerCase() === (name || "").toLowerCase()
    );

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch Ä‘á»‹a chá»‰");
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e.message || "ÄÃ£ xáº£y ra lá»—i");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Khi ngÆ°á»i dÃ¹ng Ä‘á»•i Tá»‰nh â†’ reset Quáº­n, PhÆ°á»ng
  const onProvinceChange = (code) => {
    setProvinceCode(code);
    setDistrictCode("");
    setWardCode("");

    const p = provinces.find((x) => x.code === code);
    setForm((prev) => ({
      ...prev,
      province: p ? p.name : "",
      district: "",
      ward: "",
    }));
  };

  // Khi ngÆ°á»i dÃ¹ng Ä‘á»•i Quáº­n â†’ reset PhÆ°á»ng
  const onDistrictChange = (code) => {
    setDistrictCode(code);
    setWardCode("");

    const d = districts.find((x) => x.code === code);
    setForm((prev) => ({
      ...prev,
      district: d ? d.name : "",
      ward: "",
    }));
  };

  const onWardChange = (code) => {
    setWardCode(code);
    const w = wards.find((x) => x.code === code);
    setForm((prev) => ({
      ...prev,
      ward: w ? w.name : "",
    }));
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      recipientName: "",
      phoneNumber: "",
      line1: "",
      line2: "",
      ward: "",
      district: "",
      province: "",
      isDefault: false,
    });
    setProvinceCode("");
    setDistrictCode("");
    setWardCode("");
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");

    // Validate cÆ¡ báº£n
    if (!form.recipientName.trim() || !form.phoneNumber.trim() || !form.line1.trim()) {
      setError("Vui lÃ²ng nháº­p Ä‘á»§ NgÆ°á»i nháº­n, SÄT vÃ  Äá»‹a chá»‰ dÃ²ng 1");
      return;
    }
    if (!form.province || !form.district || !form.ward) {
      setError("Vui lÃ²ng chá»n Ä‘á»§ Tá»‰nh/ThÃ nh, Quáº­n/Huyá»‡n, PhÆ°á»ng/XÃ£");
      return;
    }

    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `${apiBase}/api/addresses/${editing}` : `${apiBase}/api/addresses`;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(editing ? "Cáº­p nháº­t tháº¥t báº¡i" : "ThÃªm má»›i tháº¥t báº¡i");
      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e.message || "ÄÃ£ xáº£y ra lá»—i");
    }
  };

  const setDefault = async (id) => {
    try {
      const res = await fetch(`${apiBase}/api/addresses/${id}/default`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("KhÃ´ng Ä‘áº·t máº·c Ä‘á»‹nh Ä‘Æ°á»£c");
      await fetchAll();
    } catch (e) {
      setError(e.message || "ÄÃ£ xáº£y ra lá»—i");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("XÃ³a Ä‘á»‹a chá»‰ nÃ y?")) return;
    try {
      const res = await fetch(`${apiBase}/api/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("XÃ³a tháº¥t báº¡i");
      await fetchAll();
    } catch (e) {
      setError(e.message || "ÄÃ£ xáº£y ra lá»—i");
    }
  };

  const startEdit = (a) => {
    setEditing(a.addressId);
    setForm({
      recipientName: a.recipientName || "",
      phoneNumber: a.phoneNumber || "",
      line1: a.line1 || "",
      line2: a.line2 || "",
      ward: a.ward || "",
      district: a.district || "",
      province: a.province || "",
      isDefault: a.isDefault || false,
    });

    // map tÃªn -> code Ä‘á»ƒ preselect
    const p = findProvinceByName(a.province);
    const pCode = p?.code || "";
    setProvinceCode(pCode);

    const d = pCode ? findDistrictByName(pCode, a.district) : null;
    const dCode = d?.code || "";
    setDistrictCode(dCode);

    const w = dCode ? findWardByName(dCode, a.ward) : null;
    setWardCode(w?.code || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Render input Äá»‹a chá»‰ dÃ²ng 1: Æ°u tiÃªn Autocomplete náº¿u cÃ³ key
  const Line1Input = () => {
    if (!enablePlaces) {
      return (
        <input
          value={form.line1}
          onChange={(e) => setForm({ ...form, line1: e.target.value })}
          required
        />
      );
    }
    // Chá»‰ hiá»ƒn thá»‹ Autocomplete khi isGMapsLoaded=true
    if (!isGMapsLoaded) {
      return (
        <input
          value={form.line1}
          onChange={(e) => setForm({ ...form, line1: e.target.value })}
          placeholder="Äang táº£i gá»£i Ã½..."
          required
        />
      );
    }
    return (
      <Autocomplete
        onLoad={(ac) => {
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            const value = place?.formatted_address || place?.name || "";
            if (value) {
              setForm((prev) => ({ ...prev, line1: value }));
            }
          });
        }}
        options={{
          // Giá»›i háº¡n VN
          componentRestrictions: { country: "vn" },
          fields: ["formatted_address", "name"],
          types: ["geocode"],
        }}
      >
        <input
          value={form.line1}
          onChange={(e) => setForm({ ...form, line1: e.target.value })}
          placeholder="Nháº­p Ä‘á»‹a chá»‰ (cÃ³ gá»£i Ã½ Google)"
          required
        />
      </Autocomplete>
    );
  };

  return (
    <div className="account-shell">
      <div className="account-card">
        <div className="account-header">
          <div>
            <p className="account-eyebrow">Tài khoản Sao Kim</p>
            <h1 className="account-title">Sổ địa chỉ</h1>
            <p className="account-subtitle">
              Quản lý địa chỉ giao nhận để Sao Kim phục vụ bạn nhanh chóng và chính xác hơn.
            </p>
          </div>
          <Link to="/account" className="account-link">
            ← Quản lý hồ sơ
          </Link>
        </div>

        {error && <div className="account-alert account-alert--error">{error}</div>}

        <section className="address-panel">
          <div>
            <h2 className="address-panel__title">
              {editing ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
            </h2>
            <p className="address-panel__subtitle">
              Nhập thông tin người nhận và khu vực giao hàng để đội vận hành xử lý đơn chính xác.
            </p>
          </div>

          <form className="address-form" onSubmit={submitForm}>
            <div className="address-grid">
              <div className="account-field">
                <label>Người nhận</label>
                <input
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                  required
                />
              </div>

              <div className="account-field">
                <label>Số điện thoại</label>
                <input
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  required
                />
              </div>

              <div className="account-field" style={{ gridColumn: "1 / -1" }}>
                <label>Địa chỉ (dòng 1)</label>
                <Line1Input />
              </div>

              <div className="account-field" style={{ gridColumn: "1 / -1" }}>
                <label>Địa chỉ bổ sung (tùy chọn)</label>
                <input
                  value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  placeholder="Tòa nhà, số tầng, ghi chú giao nhận..."
                />
              </div>

              <div className="account-field">
                <label>Tỉnh/Thành</label>
                <select value={provinceCode} onChange={(e) => onProvinceChange(e.target.value)} required>
                  <option value="">Chọn Tỉnh/Thành</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="account-field">
                <label>Quận/Huyện</label>
                <select
                  value={districtCode}
                  onChange={(e) => onDistrictChange(e.target.value)}
                  disabled={!provinceCode}
                  required
                >
                  <option value="">{provinceCode ? "Chọn Quận/Huyện" : "Chọn Tỉnh trước"}</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="account-field">
                <label>Phường/Xã</label>
                <select
                  value={wardCode}
                  onChange={(e) => onWardChange(e.target.value)}
                  disabled={!districtCode}
                  required
                >
                  <option value="">{districtCode ? "Chọn Phường/Xã" : "Chọn Quận trước"}</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="address-checkbox">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Đặt làm địa chỉ mặc định
            </label>

            <div className="account-actions">
              {editing && (
                <button type="button" className="account-btn account-btn--ghost" onClick={resetForm}>
                  Hủy
                </button>
              )}
              <button type="submit" className="account-btn account-btn--primary">
                {editing ? "Lưu thay đổi" : "Thêm địa chỉ"}
              </button>
            </div>
          </form>
        </section>

        <section className="address-panel">
          <div>
            <h2 className="address-panel__title">Địa chỉ đã lưu</h2>
            <p className="address-panel__subtitle">
              Bạn có thể lưu nhiều địa chỉ để phục vụ các dự án và khách hàng khác nhau.
            </p>
          </div>

          {loading ? (
            <div className="address-empty">Đang tải danh sách địa chỉ...</div>
          ) : items.length === 0 ? (
            <div className="address-empty">Chưa có địa chỉ nào. Hãy thêm địa chỉ đầu tiên của bạn.</div>
          ) : (
            <div className="address-list">
              {items.map((a) => (
                <div key={a.addressId} className="address-card">
                  <div className="address-card__head">
                    <div>
                      <div className="address-card__name">{a.recipientName}</div>
                      <div className="address-card__meta">{a.phoneNumber}</div>
                    </div>
                    {a.isDefault && <span className="address-chip">Mặc định</span>}
                  </div>
                  <div className="address-card__body">
                    {[a.line1, a.line2, a.ward, a.district, a.province].filter(Boolean).join(", ")}
                  </div>
                  <div className="address-actions">
                    {!a.isDefault && (
                      <button
                        type="button"
                        className="account-btn account-btn--ghost"
                        onClick={() => setDefault(a.addressId)}
                      >
                        Đặt mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      className="account-btn account-btn--ghost"
                      onClick={() => startEdit(a)}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      className="account-btn account-btn--danger"
                      onClick={() => remove(a.addressId)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
