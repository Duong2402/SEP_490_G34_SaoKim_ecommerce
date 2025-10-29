import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft, faUnlockAlt } from "@fortawesome/free-solid-svg-icons";
import { Form, Card, Button, InputGroup, Alert } from "@themesberg/react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { code } = useParams(); // Lấy mã reset từ URL
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [variant, setVariant] = useState("info");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (newPassword !== confirmPassword) {
      setVariant("danger");
      setMsg("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://localhost:7278/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setVariant("danger");
        setMsg(data.message || "Reset failed");
      } else {
        setVariant("success");
        setMsg("Password reset successfully. Redirecting to login...");
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch {
      setVariant("danger");
      setMsg("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="auth-page" style={{ backgroundImage: `url(${BgImage})` }}>
        <div className="auth-overlay" />
        <div className="auth-card-wrap">
          <p className="text-center mb-3">
            <Card.Link as={Link} to="/" className="text-gray-700">
              <FontAwesomeIcon icon={faAngleLeft} className="me-2" /> Back to homepage
            </Card.Link>
          </p>

          <div className="bg-white shadow-soft border rounded border-light p-4 p-lg-5 w-100">
            <div className="text-center mb-4">
              <h3 className="mb-0">Reset Password</h3>
            </div>

            {msg && <Alert variant={variant}>{msg}</Alert>}

            <Form className="mt-4" onSubmit={submit}>
              <Form.Group id="newPassword" className="mb-4">
                <Form.Label>New Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group id="confirmPassword" className="mb-4">
                <Form.Label>Confirm New Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </Form>

            <div className="d-flex justify-content-center align-items-center mt-4">
              <span className="fw-normal">
                Back to{" "}
                <Card.Link as={Link} to="/login" className="fw-bold">
                  Login
                </Card.Link>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
