import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ManagerCouponForm from "./ManagerCouponForm";
import { CouponsAPI } from "../../../api/coupons";

export default function ManagerCouponCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await CouponsAPI.create(values);
      navigate("/manager/coupons");
    } catch (error) {
      console.error(error);
      alert("Không thể tạo coupon mới.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Tạo mã giảm giá</h2>
          <p className="manager-panel__subtitle">
            Cấu hình mã coupon để đồng bộ với các kênh bán hàng và chiến dịch CRM.
          </p>
        </div>
      </div>
      <ManagerCouponForm submitting={submitting} onSubmit={handleSubmit} />
    </div>
  );
}
