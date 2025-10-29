import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEnvelope, faUnlockAlt, faAngleLeft } from "@fortawesome/free-solid-svg-icons";
import { Form, Card, Button, InputGroup, Alert } from "@themesberg/react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      const res = await fetch("https://localhost:7278/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          password: form.password,
          role: "customer",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setError("Server error. Please try again later.");
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
              <h3 className="mb-0">Create an account</h3>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form className="mt-4" onSubmit={handleSubmit}>
              <Form.Group id="fullName" className="mb-4">
                <Form.Label>Full Name</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUser} />
                  </InputGroup.Text>
                  <Form.Control
                    name="fullName"
                    type="text"
                    required
                    placeholder="Your full name"
                    value={form.fullName}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group id="email" className="mb-4">
                <Form.Label>Email Address</Form.Label>
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

              <Form.Group id="password" className="mb-4">
                <Form.Label>Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    name="password"
                    type="password"
                    required
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group id="confirmPassword" className="mb-4">
                <Form.Label>Confirm Password</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faUnlockAlt} />
                  </InputGroup.Text>
                  <Form.Control
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="Confirm password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                  />
                </InputGroup>
              </Form.Group>

              <Button variant="primary" type="submit" className="w-100">
                Create account
              </Button>
            </Form>

            <div className="d-flex justify-content-center align-items-center mt-4">
              <span className="fw-normal">
                Already have an account?{" "}
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
