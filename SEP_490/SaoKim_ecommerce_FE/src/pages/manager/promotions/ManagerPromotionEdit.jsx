import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ManagerPromotionForm from "./ManagerPromotionForm";
import { PromotionsAPI } from "../../../api/promotions";

export default function ManagerPromotionEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await PromotionsAPI.detail(id, false);
        if (mounted) setPromotion(res?.data?.data ?? res?.data ?? null);
      } catch (error) {
        console.error(error);
        if (mounted) setPromotion(null);
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
      await PromotionsAPI.update(id, { ...values, productIds: null });
      navigate("/manager/promotions");
    } catch (error) {
      console.error(error);
      alert("Không thể cập nhật khuyến mãi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="manager-panel manager-empty">Đang tải khuyến mãi...</div>;
  }

  if (!promotion) {
    return (
      <div className="manager-panel manager-empty">
        Không tìm thấy khuyến mãi phù hợp.
      </div>
    );
  }

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Chỉnh sửa khuyến mãi</h2>
          <p className="manager-panel__subtitle">
            Đồng bộ nội dung ưu đãi để khớp với các kênh bán hàng khác.
          </p>
        </div>
      </div>
      <ManagerPromotionForm
        initialValues={promotion}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
