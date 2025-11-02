import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await fetch("https://localhost:7278/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword })
      });
      const data = await res.json();
      if (!res.ok) setMsg(data.message || "Error");
      else {
        setMsg(data.message);
        setTimeout(()=>navigate("/login"), 1500);
      }
    } catch (err) {
      setMsg("Server error");
    }
  };

  return (
    <form onSubmit={submit}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required />
      <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Verification code" required />
      <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password" type="password" required />
      <button type="submit">Reset password</button>
      {msg && <div>{msg}</div>}
    </form>
  );
}
