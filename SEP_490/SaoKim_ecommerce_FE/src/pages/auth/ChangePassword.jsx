import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft, faEnvelope, faUnlockAlt } from "@fortawesome/free-solid-svg-icons";
import { Col, Row, Form, Card, Button, FormCheck, Container, InputGroup, Alert } from "@themesberg/react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

export default function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate đơn giản phía client
    if (form.newPassword.length < 8) {
      setError("New password phải có ít nhất 8 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError("Confirm password không khớp.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token"); // nếu API yêu cầu Bearer

      const res = await fetch("https://localhost:7278/api/Auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: form.email,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Change password failed");
        return;
      }

      setSuccess("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      // Xóa token cũ nếu có, để buộc đăng nhập lại
      localStorage.removeItem("token");
      localStorage.removeItem("role");

      // Điều hướng sau 1 chút cho UX
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError("Server error. Please try again.", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section
        className="auth-page"
        style={{ backgroundImage: `url(${BgImage})` }}
      >
        <div className="auth-overlay" />

        <div className="auth-card-wrap">
          <p className="text-center mb-3">
            <Card.Link as={Link} to="/" className="text-gray-700">
              <FontAwesomeIcon icon={faAngleLeft} className="me-2" /> Back to homepage
            </Card.Link>
          </p>

          <div className="bg-white shadow-soft border rounded border-light p-4 p-lg-5 w-100">
            <div className="text-center mb-4">
              <h3 className="mb-0">Change Password</h3>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form className="mt-4" onSubmit={handleSubmit}>
              <Form.Group id="email" className="mb-4">
                <Form.Label>Your Email</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </InputGroup.Text>
                  <Form.Control
                    name="email"
                    type="email"
                    required
                    placeholder="example@company.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group id="currentPassword" className="mb-4">
                <Form.Label>Current Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    name="currentPassword"
                    type="password"
                    required
                    placeholder="Current password"
                    value={form.currentPassword}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group id="newPassword" className="mb-4">
                <Form.Label>New Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    name="newPassword"
                    type="password"
                    required
                    placeholder="New password"
                    value={form.newPassword}
                    onChange={handleChange}
                  />
                </InputGroup>
                <Form.Text>Mật khẩu mới tối thiểu 8 ký tự.</Form.Text>
              </Form.Group>

              <Form.Group id="confirmNewPassword" className="mb-4">
                <Form.Label>Confirm New Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    name="confirmNewPassword"
                    type="password"
                    required
                    placeholder="Re-enter new password"
                    value={form.confirmNewPassword}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <Form.Check type="checkbox">
                  <FormCheck.Input id="rememberChangePw" className="me-2" />
                  <FormCheck.Label htmlFor="rememberChangePw" className="mb-0">
                    Remember this device
                  </FormCheck.Label>
                </Form.Check>
                <Card.Link as={Link} to="/login" className="small text-end">
                  Back to Login
                </Card.Link>
              </div>

              <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                {loading ? "Processing..." : "Change password"}
              </Button>
            </Form>

            <div className="d-flex justify-content-center align-items-center mt-4">
              <span className="fw-normal">
                Need an account?
                <Card.Link as={Link} to="/register" className="fw-bold">
                  {` Create account `}
                </Card.Link>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
