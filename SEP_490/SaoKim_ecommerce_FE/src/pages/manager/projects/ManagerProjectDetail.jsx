import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProjectAPI } from "../../../api/ProjectManager/projects";
import { ProjectProductAPI } from "../../../api/ProjectManager/project-products";
import { ProjectExpenseAPI } from "../../../api/ProjectManager/project-expenses";

const STATUS_LABELS = {
  Draft: "Nháp",
  Active: "Đang triển khai",
  Done: "Hoàn thành",
  Cancelled: "Đã hủy",
};

const formatCurrency = (value) => {
  if (value == null) return "0 ₫";
  return Number(value).toLocaleString("vi-VN") + " ₫";
};

export default function ManagerProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [projectRes, productRes, expenseRes] = await Promise.all([
          ProjectAPI.getById(id),
          ProjectProductAPI.list(id),
          ProjectExpenseAPI.list(id, { Page: 1, PageSize: 50 }),
        ]);

        if (!mounted) return;
        setProject(projectRes?.data?.data ?? projectRes?.data ?? null);

        const prodPayload = productRes?.data?.data ?? productRes?.data ?? {};
        const prodItems =
          prodPayload?.items ??
          prodPayload?.Items ??
          (Array.isArray(prodPayload) ? prodPayload : []);
        setProducts(Array.isArray(prodItems) ? prodItems : []);

        const expPayload = expenseRes?.data?.data ?? expenseRes?.data ?? {};
        const pageObj = expPayload?.page ?? expPayload?.Page ?? {};
        const expenseItems =
          pageObj?.items ??
          pageObj?.Items ??
          expPayload?.items ??
          expPayload?.Items ??
          [];
        setExpenses(Array.isArray(expenseItems) ? expenseItems : []);
        setTotalExpense(
          Number(expPayload?.totalAmount ?? expPayload?.TotalAmount ?? 0)
        );
      } catch (err) {
        console.error(err);
        if (mounted) setError("Không thể tải dữ liệu dự án.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="manager-panel manager-empty">
        Đang tải thông tin dự án...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="manager-panel manager-empty">
        {error || "Không tìm thấy dự án tương ứng."}
      </div>
    );
  }

  return (
    <div className="manager-section">
      <section className="manager-panel">
        <div className="manager-panel__header manager-overview__header">
          <div className="manager-overview__title">
            <p className="manager-panel__subtitle">Mã dự án: {project.code}</p>
            <h2 className="manager-panel__title">{project.name}</h2>
            <StatusBadge value={project.status} />
          </div>
          <div className="manager-panel__actions">
            <button
              type="button"
              className="manager-btn manager-btn--outline"
              onClick={() => navigate(`/manager/projects/${id}/edit`)}
            >
              Chỉnh sửa
            </button>
            <Link
              to={`/manager/projects/${id}/report`}
              className="manager-btn manager-btn--primary"
            >
              Xem báo cáo
            </Link>
          </div>
        </div>

        <div className="manager-overview-grid">
          <OverviewCard label="Khách hàng" value={project.customerName} />
          <OverviewCard label="Liên hệ" value={project.customerContact} />
          <OverviewCard
            label="Giá trị dự án"
            value={formatCurrency(project.budget)}
            highlight
          />
          <OverviewCard
            label="Ngày bắt đầu"
            value={
              project.startDate
                ? new Date(project.startDate).toLocaleDateString("vi-VN")
                : "-"
            }
          />
          <OverviewCard
            label="Ngày kết thúc"
            value={
              project.endDate
                ? new Date(project.endDate).toLocaleDateString("vi-VN")
                : "-"
            }
          />
          <OverviewCard
            label="PM phụ trách"
            value={project.projectManagerName || "-"}
          />
          <OverviewCard label="Người tạo" value={project.createdBy || "-"} />
          <OverviewCard
            label="Ghi chú"
            value={project.description || "-"}
            full
          />
        </div>
      </section>

      <section className="manager-panel">
        <div className="manager-panel__header">
          <div>
            <h2 className="manager-panel__title">Hạng mục sản phẩm</h2>
            <p className="manager-panel__subtitle">
              Danh sách vật tư và số lượng phân bổ cho dự án.
            </p>
          </div>
        </div>
        <div className="manager-table__wrapper">
          {products.length === 0 ? (
            <div className="manager-table__empty">
              Chưa có sản phẩm nào được gán.
            </div>
          ) : (
            <table className="manager-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Đơn vị</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.uom}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="manager-panel">
        <div className="manager-panel__header">
          <div>
            <h2 className="manager-panel__title">Chi phí phát sinh</h2>
            <p className="manager-panel__subtitle">
              Tổng chi phí thực tế:{" "}
              <strong>{formatCurrency(totalExpense)}</strong>
            </p>
          </div>
        </div>
        <div className="manager-table__wrapper">
          {expenses.length === 0 ? (
            <div className="manager-table__empty">
              Chưa có khoản chi phí nào.
            </div>
          ) : (
            <table className="manager-table">
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Hạng mục</th>
                  <th>Nhà cung cấp</th>
                  <th>Số tiền</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      {expense.date
                        ? new Date(
                            expense.date
                          ).toLocaleDateString("vi-VN")
                        : "-"}
                    </td>
                    <td>{expense.category ?? "-"}</td>
                    <td>{expense.vendor ?? "-"}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                    <td>{expense.description ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ value }) {
  if (!value) return null;
  let className = "manager-status";
  if (value === "Draft") className += " manager-status--pending";
  if (value === "Cancelled") className += " manager-status--danger";
  return (
    <span
      className={className}
      style={{ marginTop: 8, display: "inline-flex" }}
    >
      <span className="manager-status__dot" aria-hidden="true" />
      {STATUS_LABELS[value] ?? value}
    </span>
  );
}

function OverviewCard({ label, value, highlight = false, full = false }) {
  let className = "manager-overview-card";
  if (highlight) className += " manager-overview-card--highlight";
  if (full) className += " manager-overview-card--full";
  return (
    <div className={className}>
      <div className="manager-overview-card__label">{label}</div>
      <div className="manager-overview-card__value">{value || "-"}</div>
    </div>
  );
}
