import React, { useEffect, useState } from "react";
import { CouponsAPI } from "../api/coupons";
import Portal from "./Portal";

const def = {
  code: "", name: "", description: "",
  discountType: "Percentage", discountValue: "",
  minOrderAmount: "", maxUsage: "", perUserLimit: "",
  startDate: "", endDate: "", status: "Draft"
};

export default function AddEditCouponModal({ coupon, onClose, onSaved }) {
  const [f, setF] = useState(def);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (coupon?.id) {
        const res = await CouponsAPI.detail(coupon.id);
        const d = res?.data?.data ?? res?.data ?? coupon;
        setF({
          code: d.code ?? "", name: d.name ?? "", description: d.description ?? "",
          discountType: d.discountType ?? "Percentage", discountValue: d.discountValue ?? "",
          minOrderAmount: d.minOrderAmount ?? "", maxUsage: d.maxUsage ?? "", perUserLimit: d.perUserLimit ?? "",
          startDate: d.startDate ? new Date(d.startDate).toISOString().slice(0,16) : "",
          endDate: d.endDate ? new Date(d.endDate).toISOString().slice(0,16) : "",
          status: d.status ?? "Draft"
        });
      } else setF(def);
    })();
  }, [coupon]);

  const onChange = e => setF(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: f.code.trim(),
        name: f.name.trim(),
        description: f.description || null,
        discountType: f.discountType,
        discountValue: Number(f.discountValue),
        minOrderAmount: f.minOrderAmount === "" ? null : Number(f.minOrderAmount),
        maxUsage: f.maxUsage === "" ? null : Number(f.maxUsage),
        perUserLimit: f.perUserLimit === "" ? null : Number(f.perUserLimit),
        startDate: f.startDate ? new Date(f.startDate).toISOString() : null,
        endDate: f.endDate ? new Date(f.endDate).toISOString() : null,
        status: f.status,
      };
      if (coupon?.id) await CouponsAPI.update(coupon.id, payload);
      else await CouponsAPI.create(payload);
      await onSaved?.();
    } catch (err) {
      console.error(err);
      alert("Lưu coupon thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div onClick={onClose} style={backdrop}>
        <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} style={modal(760)}>
          <form onSubmit={onSubmit}>
            <div style={header}>
              <h3 style={{margin:0}}>{coupon?.id ? "Cập nhật coupon" : "Tạo coupon"}</h3>
              <button type="button" onClick={onClose} style={xbtn}>×</button>
            </div>

            <div style={{padding:16, display:"grid", gap:12}}>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <div>
                  <label>Mã coupon</label>
                  <input className="input" name="code" value={f.code} onChange={onChange} required />
                </div>
                <div>
                  <label>Tên</label>
                  <input className="input" name="name" value={f.name} onChange={onChange} required />
                </div>
              </div>

              <div>
                <label>Mô tả</label>
                <textarea className="input" name="description" rows={3} value={f.description} onChange={onChange}/>
              </div>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
                <div>
                  <label>Loại giảm</label>
                  <select className="input" name="discountType" value={f.discountType} onChange={onChange}>
                    <option value="Percentage">Percentage</option>
                    <option value="FixedAmount">FixedAmount</option>
                  </select>
                </div>
                <div>
                  <label>Mức giảm</label>
                  <input className="input" type="number" min="0" step="1" name="discountValue" value={f.discountValue} onChange={onChange} required/>
                </div>
                <div>
                  <label>Đơn hàng tối thiểu (VND)</label>
                  <input className="input" type="number" min="0" step="1000" name="minOrderAmount" value={f.minOrderAmount} onChange={onChange}/>
                </div>
              </div>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
                <div>
                  <label>Max usage</label>
                  <input className="input" type="number" min="0" step="1" name="maxUsage" value={f.maxUsage} onChange={onChange}/>
                </div>
                <div>
                  <label>Per user limit</label>
                  <input className="input" type="number" min="0" step="1" name="perUserLimit" value={f.perUserLimit} onChange={onChange}/>
                </div>
                <div>
                  <label>Trạng thái</label>
                  <select className="input" name="status" value={f.status} onChange={onChange}>
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                <div>
                  <label>Bắt đầu</label>
                  <input className="input" type="datetime-local" name="startDate" value={f.startDate} onChange={onChange}/>
                </div>
                <div>
                  <label>Kết thúc</label>
                  <input className="input" type="datetime-local" name="endDate" value={f.endDate} onChange={onChange}/>
                </div>
              </div>
            </div>

            <div style={footer}>
              <button type="button" className="btn" onClick={onClose} disabled={saving}>Huỷ</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

const backdrop = {position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999999};
const modal = (w)=>({background:"#fff", width:w, maxWidth:"95vw", borderRadius:12, border:"1px solid rgba(148,163,184,.12)", boxShadow:"0 10px 30px rgba(0,0,0,.2)"});
const header = {padding:"14px 16px", borderBottom:"1px solid #eee", display:"flex", justifyContent:"space-between", alignItems:"center"};
const footer = {padding:"12px 16px", borderTop:"1px solid #eee", display:"flex", justifyContent:"flex-end", gap:8};
const xbtn = {background:"transparent", border:0, fontSize:22, cursor:"pointer"};
