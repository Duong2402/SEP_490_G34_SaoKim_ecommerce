import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ManagerPromotionForm from "./ManagerPromotionForm";
import { PromotionsAPI } from "../../../api/promotions";

export default function ManagerPromotionCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await PromotionsAPI.create({ ...values, productIds: null });
      navigate("/manager/promotions");
    } catch (error) {
      console.error(error);
      alert("Không thể tạo khuyến mãi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Tạo khuyến mãi mới</h2>
          <p className="manager-panel__subtitle">
            Thiết lập thời gian và giá trị giảm để đồng bộ cùng các chiến dịch marketing.
          </p>
        </div>
      </div>
      <ManagerPromotionForm submitting={submitting} onSubmit={handleSubmit} />
    </div>
  );
}
