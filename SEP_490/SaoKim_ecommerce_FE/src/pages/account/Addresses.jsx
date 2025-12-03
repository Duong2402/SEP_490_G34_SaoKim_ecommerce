import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getProvinces, getDistricts, getWards } from "sub-vn";
import "../../styles/account.css";

export default function Addresses() {
  const navigate = useNavigate();
  const location = useLocation();

  // nếu được điều hướng từ trang khác (vd: Checkout) thì from sẽ có giá trị, ví dụ "/checkout"
  const from = location.state?.from || null;

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
    ward: "",
    district: "",
    province: "",
    isDefault: false,
  });

  // selection state (lưu code để đổ danh sách phụ thuộc)
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardCode, setWardCode] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const provinces = useMemo(() => getProvinces(), []);

  const districts = useMemo(() => {
    if (!provinceCode) return [];
    const raw = getDistricts(provinceCode);
    return raw.filter(
      (d) =>
        String(d.province_code ?? d.parent_code) === String(provinceCode)
    );
  }, [provinceCode]);

  const wards = useMemo(() => {
    if (!districtCode) return [];
    const raw = getWards(districtCode);
    return raw.filter(
      (w) =>
        String(w.district_code ?? w.parent_code) === String(districtCode)
    );
  }, [districtCode]);

  // Tìm theo tên (vì DB lưu tên tỉnh/quận/phường)
  const findProvinceByName = (name) =>
    provinces.find((p) => p.name === name);

  const findDistrictByName = (provCode, name) =>
    getDistricts(provCode).find((d) => d.name === name);

  const findWardByName = (distCode, name) =>
    getWards(distCode).find((w) => w.name === name);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không tải được danh sách địa chỉ");
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
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

  // Khi người dùng đổi Tỉnh → reset Quận, Phường
  const onProvinceChange = (code) => {
    const codeStr = String(code);
    setProvinceCode(codeStr);
    setDistrictCode("");
    setWardCode("");

    const p = provinces.find((x) => String(x.code) === codeStr);
    setForm((prev) => ({
      ...prev,
      province: p ? p.name : "",
      district: "",
      ward: "",
    }));
  };

  // Khi người dùng đổi Quận → reset Phường
  const onDistrictChange = (code) => {
    const codeStr = String(code);
    setDistrictCode(codeStr);
    setWardCode("");

    const d = districts.find((x) => String(x.code) === codeStr);
    setForm((prev) => ({
      ...prev,
      district: d ? d.name : "",
      ward: "",
    }));
  };

  const onWardChange = (code) => {
    const codeStr = String(code);
    setWardCode(codeStr);
    const w = wards.find((x) => String(x.code) === codeStr);
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
      ward: "",
      district: "",
      province: "",
      isDefault: false,
    });
    setProvinceCode("");
    setDistrictCode("");
    setWardCode("");
  };

  // ====== HÀM SUBMIT CÓ THÊM BƯỚC LẤY TỌA ĐỘ (CÁCH 1) ======
  const submitForm = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.recipientName.trim() ||
      !form.phoneNumber.trim() ||
      !form.line1.trim()
    ) {
      setError("Vui lòng nhập đủ Người nhận, SĐT và Địa chỉ dòng 1");
      return;
    }
    if (!form.province || !form.district || !form.ward) {
      setError("Vui lòng chọn đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã");
      return;
    }

    // 1) Ghép địa chỉ đầy đủ để geocode
    const fullAddress = `${form.line1}, ${form.ward}, ${form.district}, ${form.province}, Vietnam`;

    let lat = null;
    let lng = null;

    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(fullAddress);

      const geoRes = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (geoRes.ok) {
        const data = await geoRes.json();
        if (Array.isArray(data) && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy tọa độ từ Nominatim:", err);
      // Nếu lỗi thì để lat/lng = null, backend sẽ fallback khoảng cách = 0
    }

    // 2) Payload gửi lên backend: form + latitude/longitude
    const payload = {
      ...form,
      latitude: lat,
      longitude: lng,
    };

    try {
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `${apiBase}/api/addresses/${editing}`
        : `${apiBase}/api/addresses`;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok)
        throw new Error(editing ? "Cập nhật thất bại" : "Thêm mới thất bại");

      // Nếu trang này được mở từ trang khác (vd Checkout),
      // sau khi thêm/sửa xong thì điều hướng quay về trang đó.
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Người dùng mở trực tiếp /account/addresses → reload danh sách
      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    }
  };
  // ====== HẾT PHẦN SUBMIT ======

  const setDefault = async (id) => {
    try {
      const res = await fetch(`${apiBase}/api/addresses/${id}/default`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không đặt mặc định được");
      await fetchAll();
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Xóa địa chỉ này?")) return;
    try {
      const res = await fetch(`${apiBase}/api/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      await fetchAll();
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    }
  };

  const startEdit = (a) => {
    setEditing(a.addressId);
    setForm({
      recipientName: a.recipientName || "",
      phoneNumber: a.phoneNumber || "",
      line1: a.line1 || "",
      ward: a.ward || "",
      district: a.district || "",
      province: a.province || "",
      isDefault: a.isDefault || false,
    });

    // map tên -> code để preselect
    const p = a.province ? findProvinceByName(a.province) : null;
    const pCode = p?.code ? String(p.code) : "";
    setProvinceCode(pCode);

    const d =
      pCode && a.district ? findDistrictByName(pCode, a.district) : null;
    const dCode = d?.code ? String(d.code) : "";
    setDistrictCode(dCode);

    const w = dCode && a.ward ? findWardByName(dCode, a.ward) : null;
    const wCode = w?.code ? String(w.code) : "";
    setWardCode(wCode);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "24px auto",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Quản lý địa chỉ</h2>
        <Link to="/account" style={{ textDecoration: "none" }}>
          &larr; Về thông tin tài khoản
        </Link>
      </div>

      {error && (
        <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>
      )}

      {/* Form tạo/sửa */}
      <section className="address-panel" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="address-panel__title">
            {editing ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
          </h2>
          <p className="address-panel__subtitle">
            Nhập thông tin người nhận và khu vực giao hàng để đội vận hành xử lý
            đơn chính xác.
          </p>
        </div>

        <form className="address-form" onSubmit={submitForm}>
          <div className="address-grid">
            <div className="account-field">
              <label>Người nhận</label>
              <input
                value={form.recipientName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    recipientName: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="account-field">
              <label>Số điện thoại</label>
              <input
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phoneNumber: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="account-field account-field--full">
              <label>Địa chỉ cụ thể</label>
              <input
                value={form.line1}
                onChange={(e) =>
                  setForm({ ...form, line1: e.target.value })
                }
                placeholder="Nhập địa chỉ cụ thể"
                required
              />
            </div>

            <div className="account-field">
              <label>Tỉnh/Thành</label>
              <select
                value={provinceCode}
                onChange={(e) => onProvinceChange(String(e.target.value))}
                required
              >
                <option value="">Chọn Tỉnh/Thành</option>
                {provinces.map((p) => (
                  <option key={p.code} value={String(p.code)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="account-field">
              <label>Quận/Huyện</label>
              <select
                value={districtCode}
                onChange={(e) => onDistrictChange(String(e.target.value))}
                disabled={!provinceCode}
                required
              >
                <option value="">
                  {provinceCode ? "Chọn Quận/Huyện" : "Chọn Tỉnh trước"}
                </option>
                {districts.map((d) => (
                  <option key={d.code} value={String(d.code)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="account-field">
              <label>Phường/Xã</label>
              <select
                value={wardCode}
                onChange={(e) => onWardChange(String(e.target.value))}
                disabled={!districtCode}
                required
              >
                <option value="">
                  {districtCode ? "Chọn Phường/Xã" : "Chọn Quận trước"}
                </option>
                {wards.map((w) => (
                  <option key={w.code} value={String(w.code)}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="address-checkbox">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isDefault: e.target.checked,
                  })
                }
              />
              Đặt làm địa chỉ mặc định
            </label>
          </div>

          {error && (
            <div className="account-alert account-alert--error">
              {error}
            </div>
          )}

          <div className="account-actions">
            {editing && (
              <button
                type="button"
                className="account-btn account-btn--ghost"
                onClick={resetForm}
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              className="account-btn account-btn--primary"
            >
              {editing ? "Lưu thay đổi" : "Thêm địa chỉ"}
            </button>
          </div>
        </form>
      </section>

      {/* Danh sách địa chỉ đã lưu */}
      <section className="address-panel">
        <div>
          <h2 className="address-panel__title">Địa chỉ đã lưu</h2>
          <p className="address-panel__subtitle">
            Bạn có thể lưu nhiều địa chỉ để phục vụ các dự án và khách hàng
            khác nhau.
          </p>
        </div>

        {loading ? (
          <div className="address-empty">Đang tải danh sách địa chỉ...</div>
        ) : items.length === 0 ? (
          <div className="address-empty">
            Chưa có địa chỉ nào. Hãy thêm địa chỉ đầu tiên của bạn.
          </div>
        ) : (
          <div className="address-list">
            {items.map((a) => (
              <div key={a.addressId} className="address-card">
                <div className="address-card__head">
                  <div>
                    <div className="address-card__name">
                      {a.recipientName}
                    </div>
                    <div className="address-card__meta">
                      {a.phoneNumber}
                    </div>
                  </div>
                  {a.isDefault && (
                    <span className="address-chip">Mặc định</span>
                  )}
                </div>
                <div className="address-card__body">
                  {[a.line1, a.ward, a.district, a.province]
                    .filter(Boolean)
                    .join(", ")}
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
  );
}
