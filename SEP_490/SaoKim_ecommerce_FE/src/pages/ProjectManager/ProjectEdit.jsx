import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import ProjectForm from "./ProjectForm";

export default function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const res = await ProjectAPI.getById(id);
        const body = res || {};
        setDetail(body.data ?? body ?? null);
      } catch (err) {
        console.error(err);
        alert("Không thể tải chi tiết dự án.");
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id, t]);

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      await ProjectAPI.update(id, {
        name: payload.name,
        customerName: payload.customerName,
        customerContact: payload.customerContact,
        status: payload.status,
        startDate: payload.startDate,
        endDate: payload.endDate,
        budget: payload.budget,
        description: payload.description,
      });
      alert("Cập nhật dự án thành công.");
      navigate("/projects");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Không thể cập nhật dự án.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pm-page">
        <div className="panel loading-state">Đang tải dự án...</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="pm-page">
        <div className="panel empty-state">
          <div className="empty-state-title">Không tìm thấy dự án</div>
          <div className="empty-state-subtitle">
            Không tìm thấy dự án này. Có thể dự án đã bị xóa hoặc bạn không có quyền truy cập.
          </div>
          <Link to="/projects" className="btn btn-primary">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const subtitle = detail.code
    ? `Cập nhật phạm vi, giá trị dự án và mốc thời gian cho ${detail.code}.`
    : "Cập nhật phạm vi, giá trị dự án và mốc thời gian cho dự án này.";

  return (
    <div className="pm-page">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Chỉnh sửa dự án</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
          <div className="actions">
            <Link to={`/projects/${id}`} className="btn btn-outline">
              Xem chi tiết
            </Link>
            <Link to="/projects" className="btn btn-ghost">
              Hủy
            </Link>
          </div>
        </header>

        <ProjectForm
          initialValues={detail}
          onSubmit={handleSubmit}
          submitting={saving}
          showCode={false}
        />
      </div>
    </div>
  );
}
