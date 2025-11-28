import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProjectAPI, TaskAPI } from "../../api/ProjectManager/projects";
import { ProjectProductAPI } from "../../api/ProjectManager/project-products";
import { ProjectExpenseAPI } from "../../api/ProjectManager/project-expenses";
import ProjectForm from "./ProjectForm";

export default function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await ProjectAPI.getById(id);
        const body = res || {};
        if (mounted) setDetail(body.data ?? body ?? null);
      } catch (err) {
        console.error(err);
        alert("Không thể tải chi tiết dự án.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingRelated(true);
        const [taskRes, prodRes, expRes] = await Promise.all([
          TaskAPI.list(id),
          ProjectProductAPI.list(id),
          ProjectExpenseAPI.list(id, { Page: 1, PageSize: 100 }),
        ]);

        if (!mounted) return;

        const taskPayload = taskRes?.data ?? taskRes ?? {};
        const taskItems = taskPayload.items ?? taskPayload;
        setTasks(Array.isArray(taskItems) ? taskItems : []);

        const prodPayload = prodRes?.data ?? prodRes ?? {};
        const prodItems = prodPayload.items ?? prodPayload;
        setProducts(Array.isArray(prodItems) ? prodItems : []);

        const expPayload = expRes?.data ?? expRes ?? {};
        const page = expPayload.page ?? expPayload;
        const expItems = page.items ?? expPayload.items ?? [];
        setExpenses(Array.isArray(expItems) ? expItems : []);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setTasks([]);
          setProducts([]);
          setExpenses([]);
        }
      } finally {
        if (mounted) setLoadingRelated(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const tasksAllDone = () =>
    (tasks || []).every((task) => {
      if (task.status === "Done" || task.overallStatus === "Done") return true;
      if (Array.isArray(task.days) && task.days.length) {
        const last = [...task.days].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
        return last?.status === "Done" || last?.Status === "Done";
      }
      return false;
    });

  const handleSubmit = async (payload) => {
    try {
      if (payload.status === "Done") {
        if (loadingRelated) {
          alert("Vui lòng chờ tải công việc/chi phí xong trước khi hoàn thành.");
          return;
        }
        if (!tasksAllDone()) {
          alert("Không thể hoàn thành: còn công việc chưa hoàn thành.");
          return;
        }
        if (!products.length) {
          alert("Không thể hoàn thành: chưa có doanh thu/sản phẩm được xác nhận.");
          return;
        }
        if (!expenses.length) {
          alert("Không thể hoàn thành: chưa cập nhật chi phí/hạch toán.");
          return;
        }
      }

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
