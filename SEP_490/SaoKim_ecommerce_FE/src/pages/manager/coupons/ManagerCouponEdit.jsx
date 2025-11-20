import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ManagerCouponForm from "./ManagerCouponForm";
import { CouponsAPI } from "../../../api/coupons";

export default function ManagerCouponEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await CouponsAPI.detail(id);
        if (mounted) setCoupon(res?.data?.data ?? res?.data ?? null);
      } catch (error) {
        console.error(error);
        if (mounted) setCoupon(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await CouponsAPI.update(id, values);
      navigate("/manager/coupons");
    } catch (error) {
      console.error(error);
      alert("Không thể cập nhật coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="manager-panel manager-empty">Đang tải thông tin coupon...</div>;
  }

  if (!coupon) {
    return (
      <div className="manager-panel manager-empty">
        Không tìm thấy coupon tương ứng.
      </div>
    );
  }

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Chỉnh sửa mã giảm giá</h2>
          <p className="manager-panel__subtitle">
            Đảm bảo thông tin coupon đồng nhất trên toàn hệ thống.
          </p>
        </div>
      </div>
      <ManagerCouponForm
        initialValues={coupon}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
