import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ManagerProjectForm from "./ManagerProjectForm";
import { ProjectAPI } from "../../../api/ProjectManager/projects";

export default function ManagerProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await ProjectAPI.getById(id);
        if (mounted) setDetail(res?.data?.data);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function handleSubmit(values) {
    try {
      setSubmitting(true);
      const payload = {
        id: Number(id),
        name: values.name,
        customerName: values.customerName,
        customerContact: values.customerContact,
        status: values.status,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
        budget: values.budget ? Number(values.budget) : null,
        description: values.description,
      };
      await ProjectAPI.update(id, payload);
      navigate(`/manager/projects/${id}`);
    } catch (e) {
      console.error(e);
      alert("Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!detail) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Edit Project</div>
      <ManagerProjectForm initialValues={detail} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
