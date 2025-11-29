import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ManagerProjectForm from "./ManagerProjectForm";
import { ProjectAPI } from "../../../api/ProjectManager/projects";

export default function ManagerProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await ProjectAPI.getById(id);
        const body = res?.data?.data ?? res?.data ?? res ?? null;
        if (mounted) setDetail(body);
      } catch (err) {
        console.error(err);
        if (mounted)
          setError("Không tìm thấy dự án hoặc đã có lỗi xảy ra.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleSubmit(values) {
    try {
      setSubmitting(true);
      const payload = {
        ...values,
        id: Number(id),
      };
      await ProjectAPI.update(id, payload);
      navigate(`/manager/projects/${id}`);
    } catch (err) {
      console.error(err);
      alert("Không thể cập nhật dự án. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="manager-panel manager-empty">
        Đang tải dữ liệu dự án...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="manager-panel manager-empty">
        {error || "Dự án không tồn tại hoặc đã bị xóa."}
      </div>
    );
  }

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Cập nhật dự án</h2>
          <p className="manager-panel__subtitle">
            Điều chỉnh thông tin để phản ánh đúng tiến độ và cam kết với khách
            hàng.
          </p>
        </div>
      </div>
      <ManagerProjectForm
        initialValues={detail}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
