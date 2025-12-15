import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ManagerProjectForm from "./ManagerProjectForm";
import { ProjectAPI } from "../../../api/ProjectManager/projects";

export default function ManagerProjectCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values) {
    try {
      setSubmitting(true);
      const payload = { ...values };
      const res = await ProjectAPI.create(payload);
      const newId = res?.data?.data?.id ?? res?.data?.id;
      navigate(`/manager/projects/${newId}`);
    } catch (error) {
      console.error(error);
      alert("Không thể tạo dự án, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Tạo dự án mới</h2>
          <p className="manager-panel__subtitle">
            Điền đầy đủ thông tin để khởi tạo và phân phối nguồn lực chính xác.
          </p>
        </div>
      </div>
      <ManagerProjectForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
