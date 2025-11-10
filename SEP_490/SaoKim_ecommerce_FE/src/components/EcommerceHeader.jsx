import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProvinces, getDistricts, getWards } from "sub-vn";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";

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

  // selection state (lưu code để đổ danh sách phụ thuộc)
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardCode, setWardCode] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Google Places loader (tùy chọn)
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

  // Khi người dùng đổi Quận → reset Phường
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

    // Validate cơ bản
    if (!form.recipientName.trim() || !form.phoneNumber.trim() || !form.line1.trim()) {
      setError("Vui lòng nhập đủ Người nhận, SĐT và Địa chỉ dòng 1");
      return;
    }
    if (!form.province || !form.district || !form.ward) {
      setError("Vui lòng chọn đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã");
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
      if (!res.ok) throw new Error(editing ? "Cập nhật thất bại" : "Thêm mới thất bại");
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

    // map tên -> code để preselect
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

  // Render input Địa chỉ dòng 1: ưu tiên Autocomplete nếu có key
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
    // Chỉ hiển thị Autocomplete khi isGMapsLoaded=true
    if (!isGMapsLoaded) {
      return (
        <input
          value={form.line1}
          onChange={(e) => setForm({ ...form, line1: e.target.value })}
          placeholder="Đang tải gợi ý..."
          required
        />
      );
    }
    return (
      <Autocomplete
        onPlaceChanged={(/* place auto trong đối tượng Autocomplete */) => {
          // Lấy formatted_address
          const place = window.google?.maps?.places?.PlacesServiceStatus ? null : null; // tránh lỗi TS khi biên dịch
        }}
        onLoad={(ac) => {
          // hook sự kiện place_changed để lấy address
          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            if (place && place.formatted_address) {
              setForm((prev) => ({ ...prev, line1: place.formatted_address }));
            } else if (place && place.name) {
              setForm((prev) => ({ ...prev, line1: place.name }));
            }
          });
        }}
        options={{
          // Giới hạn VN
          componentRestrictions: { country: "vn" },
          fields: ["formatted_address", "name", "address_components", "geometry"],
          types: ["geocode"],
        }}
      >
        <input
          value={form.line1}
          onChange={(e) => setForm({ ...form, line1: e.target.value })}
          placeholder="Nhập địa chỉ (có gợi ý)"
          required
        />
      </Autocomplete>
    );
  };

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Quản lý địa chỉ</h2>
        <Link to="/account" style={{ textDecoration: "none" }}>&larr; Về thông tin tài khoản</Link>
      </div>

      {error && (
        <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>
      )}

      {/* Form tạo/sửa */}
      <form onSubmit={submitForm} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{editing ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Người nhận
            <input
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              required
            />
          </label>

          <label>
            Số điện thoại
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              required
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Địa chỉ (dòng 1)
            <Line1Input />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Địa chỉ (dòng 2 - tuỳ chọn)
            <input
              value={form.line2}
              onChange={(e) => setForm({ ...form, line2: e.target.value })}
            />
          </label>

          <label>
            Tỉnh/Thành
            <select
              value={provinceCode}
              onChange={(e) => onProvinceChange(e.target.value)}
              required
            >
              <option value="">Chọn Tỉnh/Thành</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </label>

          <label>
            Quận/Huyện
            <select
              value={districtCode}
              onChange={(e) => onDistrictChange(e.target.value)}
              disabled={!provinceCode}
              required
            >
              <option value="">{provinceCode ? "Chọn Quận/Huyện" : "Chọn Tỉnh trước"}</option>
              {districts.map((d) => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
            </select>
          </label>

          <label>
            Phường/Xã
            <select
              value={wardCode}
              onChange={(e) => onWardChange(e.target.value)}
              disabled={!districtCode}
              required
            >
              <option value="">{districtCode ? "Chọn Phường/Xã" : "Chọn Quận trước"}</option>
              {wards.map((w) => (
                <option key={w.code} value={w.code}>{w.name}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Đặt làm địa chỉ mặc định
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary">
            {editing ? "Lưu thay đổi" : "Thêm địa chỉ"}
          </button>
          {editing && (
            <button type="button" className="btn" onClick={resetForm}>Hủy</button>
          )}
        </div>
      </form>

      {/* Danh sách địa chỉ */}
      {loading ? (
        <div>Đang tải...</div>
      ) : items.length === 0 ? (
        <div>Chưa có địa chỉ nào.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((a) => (
            <div key={a.addressId} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600 }}>
                  {a.recipientName} • {a.phoneNumber} {a.isDefault && <span style={{ color: "#2563eb" }}>(Mặc định)</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!a.isDefault && (
                    <button className="btn btn-outline" onClick={() => setDefault(a.addressId)}>Đặt mặc định</button>
                  )}
                  <button className="btn btn-outline" onClick={() => startEdit(a)}>Sửa</button>
                  <button className="btn btn-danger" onClick={() => remove(a.addressId)}>Xóa</button>
                </div>
              </div>
              <div style={{ color: "#667" }}>
                {[a.line1, a.line2, a.ward, a.district, a.province].filter(Boolean).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}