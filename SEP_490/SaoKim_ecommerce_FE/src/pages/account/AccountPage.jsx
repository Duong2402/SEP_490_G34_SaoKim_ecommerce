import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import {
  getAllProvince,
  getDistrictsByProvinceId,
} from "vietnam-provinces-js/provinces";
import { getCommunesByDistrictId } from "vietnam-provinces-js/districts";

import { useLocation, useNavigate } from "react-router-dom";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import "../../styles/account.css";



let API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "https://localhost:7278";
if (API_BASE.endsWith("/")) API_BASE = API_BASE.slice(0, -1);

function buildImageUrl(image) {
  if (!image) return null;
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  const relative = image.startsWith("/") ? image : `/${image}`;
  return `${API_BASE}${relative}`;
}

function ProfileTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    address: "",
    dob: "",
    image: null,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Không thể tải thông tin tài khoản");
        const data = await res.json();

        let dob = "";
        if (data.dob) {
          if (typeof data.dob === "string" && data.dob.length >= 10) {
            dob = data.dob.slice(0, 10);
          } else {
            dob = new Date(data.dob).toISOString().slice(0, 10);
          }
        }

        setForm({
          name: data.name || "",
          email: data.email || "",
          phoneNumber: data.phone || data.phoneNumber || "",
          address: data.address || "",
          dob,
          image: null,
        });
        setPreviewUrl(buildImageUrl(data.image));
      } catch (e) {
        setError(e.message || "Đã xảy ra lỗi");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const fd = new FormData();
      if (form.name) fd.append("name", form.name);
      if (form.phoneNumber) fd.append("phoneNumber", form.phoneNumber);
      if (form.address) fd.append("address", form.address);
      if (form.dob) fd.append("dob", form.dob);
      if (form.image) fd.append("image", form.image);

      const res = await fetch(`${API_BASE}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Cập nhật thất bại");
      }

      setSuccess("Đã cập nhật thông tin thành công");

      const meRes = await fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (meRes.ok) {
        const data = await meRes.json();
        setPreviewUrl(buildImageUrl(data.image));
        localStorage.setItem("userName", data.name || "");
        window.dispatchEvent(new Event("localStorageChange"));
      }
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-3 text-muted">Đang tải...</div>;
  }

  return (
    <div className="account-tab">
      <div className="d-flex flex-column gap-1 mb-3">
        <p className="account-eyebrow mb-0">Tài khoản Sao Kim</p>
        <h2 className="account-section-title mb-0">Thông tin cá nhân</h2>
        <p className="account-page-subtitle">
          Cập nhật tên, số điện thoại, ngày sinh, địa chỉ và ảnh đại diện.
        </p>
      </div>

      {error && (
        <div className="account-alert account-alert--error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {success && (
        <div className="account-alert account-alert--success" style={{ marginBottom: 12 }}>
          {success}
        </div>
      )}

      <form className="account-form" onSubmit={onSubmit}>
        <div className="account-layout">
          <div className="account-avatar">
            <div className="account-avatar__preview">
              {previewUrl ? (
                <img src={previewUrl} alt="Ảnh đại diện" />
              ) : (
                <span style={{ color: "var(--account-muted)" }}>Chưa có ảnh</span>
              )}
            </div>
            <label className="account-upload">
              Chọn ảnh mới
              <input type="file" accept="image/*" onChange={onFile} />
            </label>
            <p style={{ color: "var(--account-muted)", fontSize: 13, margin: 0 }}>
              JPG, PNG dưới 5MB để hiển thị sắc nét.
            </p>
          </div>

          <div className="account-main">
            <div className="account-field">
              <label>Họ và tên</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Nhập họ tên"
              />
            </div>
            <div className="account-field">
              <label>Email (không thể thay đổi)</label>
              <input name="email" value={form.email} disabled />
            </div>

            <div className="account-grid">
              <div className="account-field">
                <label>Số điện thoại</label>
                <input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={onChange}
                  placeholder="VD: 0987..."
                />
              </div>
              <div className="account-field">
                <label>Ngày sinh</label>
                <input type="date" name="dob" value={form.dob} onChange={onChange} />
              </div>
            </div>

            <div className="account-field">
              <label>Địa chỉ</label>
              <input
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
              />
            </div>
          </div>
        </div>

        <div className="account-actions">
          <button type="submit" className="account-btn account-btn--primary" disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddressesTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || null;
  const apiBase = API_BASE;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    recipientName: "",
    phoneNumber: "",
    line1: "",
    ward: "",
    district: "",
    province: "",
    isDefault: false,
  });

  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardCode, setWardCode] = useState("");

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllProvince();
        setProvinces(data || []);
      } catch (err) {
        console.error("Lỗi tải danh sách tỉnh/thành:", err);
      }
    })();
  }, []);

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
  }, [navigate]);

  const onProvinceChange = async (code) => {
    const codeStr = String(code);
    setProvinceCode(codeStr);
    setDistrictCode("");
    setWardCode("");
    setDistricts([]);
    setWards([]);

    const p = provinces.find((x) => String(x.idProvince) === codeStr);
    setForm((prev) => ({
      ...prev,
      province: p ? p.name : "",
      district: "",
      ward: "",
    }));

    if (codeStr) {
      try {
        const ds = await getDistrictsByProvinceId(codeStr);
        setDistricts(ds || []);
      } catch (err) {
        console.error("Lỗi tải quận/huyện:", err);
      }
    }
  };

  const onDistrictChange = async (code) => {
    const codeStr = String(code);
    setDistrictCode(codeStr);
    setWardCode("");
    setWards([]);

    const d = districts.find((x) => String(x.idDistrict) === codeStr);
    setForm((prev) => ({
      ...prev,
      district: d ? d.name : "",
      ward: "",
    }));

    if (codeStr) {
      try {
        const ws = await getCommunesByDistrictId(codeStr);
        setWards(ws || []);
      } catch (err) {
        console.error("Lỗi tải phường/xã:", err);
      }
    }
  };

  const onWardChange = (code) => {
    const codeStr = String(code);
    setWardCode(codeStr);
    const w = wards.find((x) => String(x.idCommune) === codeStr);
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
    setDistricts([]);
    setWards([]);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.recipientName.trim() ||
      !form.phoneNumber.trim() ||
      !form.line1.trim()
    ) {
      setError("Vui lòng nhập đủ Người nhận, SDT và Địa chỉ dòng 1");
      return;
    }
    if (!form.province || !form.district || !form.ward) {
      setError("Vui lòng chọn đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã");
      return;
    }

    const fullAddress = `${form.line1}, ${form.ward}, ${form.district}, ${form.province}, Vietnam`;

    let lat = null;
    let lng = null;

    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(fullAddress);

      const geoRes = await fetch(url, { headers: { Accept: "application/json" } });

      if (geoRes.ok) {
        const data = await geoRes.json();
        if (Array.isArray(data) && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy tọa độ từ Nominatim:", err);
    }

    const payload = { ...form, latitude: lat, longitude: lng };

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

      if (from) {
        navigate(from, { replace: true });
        return;
      }

      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    }
  };

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

  const startEdit = async (a) => {
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

    try {
      if (a.province) {
        const p = provinces.find((x) => x.name === a.province);
        if (p) {
          const pCode = String(p.idProvince);
          setProvinceCode(pCode);

          const ds = await getDistrictsByProvinceId(pCode);
          setDistricts(ds || []);

          let dCode = "";
          if (a.district) {
            const d = (ds || []).find((x) => x.name === a.district);
            if (d) {
              dCode = String(d.idDistrict);
              setDistrictCode(dCode);

              const ws = await getCommunesByDistrictId(dCode);
              setWards(ws || []);

              if (a.ward) {
                const w = (ws || []).find((x) => x.name === a.ward);
                if (w) {
                  setWardCode(String(w.idCommune));
                } else {
                  setWardCode("");
                }
              } else {
                setWardCode("");
              }
            } else {
              setDistrictCode("");
              setWardCode("");
              setWards([]);
            }
          } else {
            setDistrictCode("");
            setWardCode("");
            setWards([]);
          }
        } else {
          setProvinceCode("");
          setDistrictCode("");
          setWardCode("");
          setDistricts([]);
          setWards([]);
        }
      } else {
        setProvinceCode("");
        setDistrictCode("");
        setWardCode("");
        setDistricts([]);
        setWards([]);
      }
    } catch (err) {
      console.error("Lỗi map địa chỉ khi chỉnh sửa:", err);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="account-tab">
      <div className="d-flex flex-column gap-1 mb-3">
        <p className="account-eyebrow mb-0">Quản lý địa chỉ</p>
        <h2 className="account-section-title mb-0">Địa chỉ giao hàng</h2>
        <p className="account-page-subtitle">
          Lưu nhiều địa chỉ để tiện giao hàng và đặt mặc định cho đơn tiếp theo.
        </p>
      </div>

      {error && <div className="account-alert account-alert--error">{error}</div>}

      <section className="address-panel" style={{ marginBottom: 20 }}>
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
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
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
                  <option key={p.idProvince} value={String(p.idProvince)}>
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
                  <option key={d.idDistrict} value={String(d.idDistrict)}>
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
                  <option key={w.idCommune} value={String(w.idCommune)}>
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

          {error && <div className="account-alert account-alert--error">{error}</div>}

          <div className="account-actions justify-content-end">
            {editing && (
              <button
                type="button"
                className="account-btn account-btn--ghost"
                onClick={resetForm}
              >
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
          <div className="address-empty">
            Chưa có địa chỉ nào. Hãy thêm địa chỉ đầu tiên của bạn.
          </div>
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

function PasswordTab() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/Auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: form.email,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Đổi mật khẩu thất bại.");
        return;
      }

      setSuccess("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError("Máy chủ gặp sự cố, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-tab">
      <div className="d-flex flex-column gap-1 mb-3">
        <p className="account-eyebrow mb-0">Bảo mật</p>
        <h2 className="account-section-title mb-0">Đổi mật khẩu</h2>
        <p className="account-page-subtitle">
          Cập nhật mật khẩu mới để tăng cường bảo vệ tài khoản của bạn.
        </p>
      </div>

      {error && <div className="account-alert account-alert--error">{error}</div>}
      {success && <div className="account-alert account-alert--success">{success}</div>}

      <form className="account-form" onSubmit={handleSubmit}>
        <div className="account-field">
          <label>Email của bạn</label>
          <input
            name="email"
            type="email"
            required
            placeholder="manager@saokim.vn"
            value={form.email}
            onChange={handleChange}
          />
        </div>
        <div className="account-field">
          <label>Mật khẩu hiện tại</label>
          <input
            name="currentPassword"
            type="password"
            required
            placeholder="Nhập mật khẩu hiện tại"
            value={form.currentPassword}
            onChange={handleChange}
          />
        </div>
        <div className="account-grid">
          <div className="account-field">
            <label>Mật khẩu mới</label>
            <input
              name="newPassword"
              type="password"
              required
              placeholder="Ít nhất 8 ký tự"
              value={form.newPassword}
              onChange={handleChange}
            />
          </div>
          <div className="account-field">
            <label>Xác nhận mật khẩu mới</label>
            <input
              name="confirmNewPassword"
              type="password"
              required
              placeholder="Nhập lại mật khẩu mới"
              value={form.confirmNewPassword}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="account-actions">
          <button type="submit" className="account-btn account-btn--primary" disabled={loading}>
            {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AccountPage({ initialTab = "profile" }) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabFromPath = useMemo(() => {
    if (location.pathname.includes("addresses")) return "addresses";
    if (location.pathname.includes("change-password")) return "password";
    return initialTab;
  }, [location.pathname, initialTab]);

  const defaultTab = location.state?.activeTab || tabFromPath || "profile";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const navItems = [
    { key: "profile", label: "Thông tin cá nhân" },
    { key: "addresses", label: "Địa chỉ giao hàng" },
    { key: "password", label: "Đổi mật khẩu" },
  ];

  return (
    <>
      <HomepageHeader />
      <div className="account-page-wrapper">
        <Container className="py-5">
          <div className="account-page-head d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
              <p className="account-eyebrow mb-1 text-uppercase">Tài khoản Sao Kim</p>
              <h1 className="account-page-title mb-1">Tài khoản Sao Kim</h1>
              <p className="account-page-subtitle">
                Quản lý thông tin cá nhân, địa chỉ giao hàng và bảo mật tài khoản tại một nơi.
              </p>
            </div>
            <button
              type="button"
              className="account-home-btn"
              onClick={() => navigate("/")}
            >
              Về trang chủ
            </button>
          </div>

          <Row className="g-4">
            <Col lg={3}>
              <div className="account-sidebar-card">
                {navItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`account-nav-item${activeTab === item.key ? " active" : ""}`}
                    onClick={() => setActiveTab(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Col>
            <Col lg={9}>
              <div className="account-main-card">
                {activeTab === "profile" && <ProfileTab />}
                {activeTab === "addresses" && <AddressesTab />}
                {activeTab === "password" && <PasswordTab />}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
      <EcommerceFooter />
    </>
  );
}
