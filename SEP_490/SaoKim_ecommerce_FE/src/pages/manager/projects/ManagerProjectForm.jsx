// src/pages/manager/projects/ManagerProjectForm.jsx
import { useEffect, useState } from "react";

export default function ManagerProjectForm({ initialValues, onSubmit, submitting }) {
  const [values, setValues] = useState({
    name: "",
    customerName: "",
    customerContact: "",
    status: "Draft",
    startDate: "",
    endDate: "",
    budget: "",
    description: "",
  });

  useEffect(() => {
    if (initialValues) {
      setValues({
        name: initialValues.name ?? "",
        customerName: initialValues.customerName ?? "",
        customerContact: initialValues.customerContact ?? "",
        status: initialValues.status ?? "Draft",
        startDate: initialValues.startDate ? initialValues.startDate.substring(0, 10) : "",
        endDate: initialValues.endDate ? initialValues.endDate.substring(0, 10) : "",
        budget: initialValues.budget ?? "",
        description: initialValues.description ?? "",
      });
    }
  }, [initialValues]);

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit(values);
  }

  const input = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    width: "100%",
    boxSizing: "border-box",
  };

  const label = { fontSize: 13, color: "#444", marginBottom: 6 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div style={label}>Project name</div>
          <input name="name" value={values.name} onChange={handleChange} required style={input} />
        </div>

        <div>
          <div style={label}>Status</div>
          <select name="status" value={values.status} onChange={handleChange} style={input}>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Done">Done</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <div style={label}>Customer name</div>
          <input name="customerName" value={values.customerName} onChange={handleChange} style={input} />
        </div>

        <div>
          <div style={label}>Customer contact</div>
          <input name="customerContact" value={values.customerContact} onChange={handleChange} style={input} />
        </div>

        <div>
          <div style={label}>Start date</div>
          <input type="date" name="startDate" value={values.startDate} onChange={handleChange} style={input} />
        </div>

        <div>
          <div style={label}>End date</div>
          {/* ✅ đã bỏ style trùng */}
          <input type="date" name="endDate" value={values.endDate} onChange={handleChange} style={input} />
        </div>

        <div>
          <div style={label}>Budget</div>
          <input name="budget" value={values.budget} onChange={handleChange} style={input} />
        </div>

        <div style={{ gridColumn: "1 / span 2" }}>
          <div style={label}>Description</div>
          <textarea name="description" value={values.description} onChange={handleChange} rows={4} style={input} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #0b1f3a",
            background: submitting ? "#94a3b8" : "#0b1f3a",
            color: "#fff",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
