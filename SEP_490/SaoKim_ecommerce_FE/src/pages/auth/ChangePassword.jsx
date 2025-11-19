import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft, faEnvelope, faUnlockAlt } from "@fortawesome/free-solid-svg-icons";
import {
  Col,
  Row,
  Form,
  Card,
  Button,
  FormCheck,
  Container,
  InputGroup,
  Alert,
} from "@themesberg/react-bootstrap";
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

    if (form.newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

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
        setError(data.message || "Đổi mật khẩu thất bại.");
        return;
      }

      setSuccess("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError("Máy chủ gặp sự cố, vui lòng thử lại.");
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
              <FontAwesomeIcon icon={faAngleLeft} className="me-2" /> Quay về trang chủ
            </Card.Link>
          </p>

          <div className="bg-white shadow-soft border rounded border-light p-4 p-lg-5 w-100">
            <div className="text-center mb-4">
              <h3 className="mb-0">Đổi mật khẩu</h3>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form className="mt-4" onSubmit={handleSubmit}>
              <Form.Group id="email" className="mb-4">
                <Form.Label>Email của bạn</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </InputGroup.Text>
                  <Form.Control
                    name="email"
                    type="email"
                    required
                    placeholder="ví dụ: manager@saokim.vn"
                    value={form.email}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group id="currentPassword" className="mb-4">
                <Form.Label>Mật khẩu hiện tại</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    name="currentPassword"
                    type="password"
                    required
                    placeholder="Mật khẩu hiện tại"
                    value={form.currentPassword}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group id="newPassword" className="mb-4">
                <Form.Label>Mật khẩu mới</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    name="newPassword"
                    type="password"
                    required
                    placeholder="Mật khẩu mới"
                    value={form.newPassword}
                    onChange={handleChange}
                  />
                </InputGroup>
                <Form.Text>Mật khẩu mới tối thiểu 8 ký tự.</Form.Text>
              </Form.Group>

              <Form.Group id="confirmNewPassword" className="mb-4">
                <Form.Label>Xác nhận mật khẩu mới</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    name="confirmNewPassword"
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    value={form.confirmNewPassword}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <Form.Check type="checkbox">
                  <FormCheck.Input id="rememberChangePw" className="me-2" />
                  <FormCheck.Label htmlFor="rememberChangePw" className="mb-0">
                    Ghi nhớ thiết bị này
                  </FormCheck.Label>
                </Form.Check>
                <Card.Link as={Link} to="/login" className="small text-end">
                  Quay lại đăng nhập
                </Card.Link>
              </div>

              <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
              </Button>
            </Form>

            <div className="d-flex justify-content-center align-items-center mt-4">
              <span className="fw-normal">
                Chưa có tài khoản?
                <Card.Link as={Link} to="/register" className="fw-bold">
                  {` Đăng ký ngay `}
                </Card.Link>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
