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
      const payload = {
        name: values.name,
        customerName: values.customerName,
        customerContact: values.customerContact,
        status: values.status,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        budget: values.budget ? Number(values.budget) : null,
        description: values.description,
      };
      const res = await ProjectAPI.create(payload);
      const newId = res?.data?.data?.id ?? res?.data?.id; // unwrap ApiResponse
      navigate(`/manager/projects/${newId}`);
    } catch (e) {
      console.error(e);
      alert("Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Create Project</div>
      <ManagerProjectForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
