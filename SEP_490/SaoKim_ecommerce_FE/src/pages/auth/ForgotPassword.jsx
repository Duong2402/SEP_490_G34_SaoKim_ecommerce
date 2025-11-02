import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { Form, Card, Button, InputGroup, Alert } from "@themesberg/react-bootstrap";
import { Link } from "react-router-dom";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [variant, setVariant] = useState("info");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // bộ đếm giây chờ

  // Tự động giảm thời gian mỗi giây nếu đang cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("https://localhost:7278/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVariant("danger");
        setMsg(data.message || "Request failed");
      } else {
        setVariant("success");
        setMsg(data.message || "A reset code has been sent to your email.");
        setCooldown(60);
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
              <h3 className="mb-0">Forgot Password</h3>
            </div>

            {msg && <Alert variant={variant}>{msg}</Alert>}

            <Form className="mt-4" onSubmit={submit}>
              <Form.Group id="email" className="mb-4">
                <Form.Label>Your Email</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </InputGroup.Text>
                  <Form.Control
                    type="email"
                    placeholder="example@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100"
                disabled={loading || cooldown > 0}
              >
                {loading
                  ? "Sending..."
                  : cooldown > 0
                  ? `Please wait (${cooldown}s)`
                  : "Send code"}
              </Button>
            </Form>

            <div className="d-flex justify-content-center align-items-center mt-4">
              <span className="fw-normal">
                Remember your password?{" "}
                <Card.Link as={Link} to="/login" className="fw-bold">
                  Login here
                </Card.Link>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
