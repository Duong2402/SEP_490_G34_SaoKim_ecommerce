import { faAngleLeft, faEnvelope, faUnlockAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
// import { faFacebookF, faGithub, faTwitter } from "@fortawesome/free-brands-svg-icons";
import { Alert, Button, Card, Form, FormCheck, InputGroup } from "@themesberg/react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import "../../assets/css/Auth.css";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Login.css";


export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("https://localhost:7278/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("role", data.role);

      navigate("/");
    } catch (err) {
      setError("Server error. Please try again.");
    }
  };

   return (
    <main>
      <section className="min-vh-100 d-flex">
        <div className="form-bg-image flex-grow-1 d-flex align-items-center">
          <div className="container-fluid d-flex flex-column">
            <p className="text-center mt-3">
              <Card.Link as={Link} to="/" className="text-gray-700">
                <FontAwesomeIcon icon={faAngleLeft} className="me-2" /> Back to homepage
              </Card.Link>
            </p>

            <div className="flex-grow-1 d-flex align-items-center justify-content-center">
              <Row className="w-100 justify-content-center">
                <Col xs={12} sm={10} md={8} lg={5} xl={4}>
                  <div className="bg-white shadow-soft border rounded border-light p-4 p-lg-5 w-100">
                    <div className="text-center mb-4">
                      <h3 className="mb-0">SaoKim welcome</h3>
                    </div>

                    {error && <Alert variant="danger">{error}</Alert>}

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

                      <Form.Group id="password" className="mb-4">
                        <Form.Label>Your Password</Form.Label>
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

                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <Form.Check type="checkbox">
                          <FormCheck.Input id="defaultCheck5" className="me-2" />
                          <FormCheck.Label htmlFor="defaultCheck5" className="mb-0">
                            Remember me
                          </FormCheck.Label>
                        </Form.Check>
                        <Card.Link as={Link} to="/forgot-password" className="small text-end">
                          Forget Password
                        </Card.Link>
                        
              </div>

                      <Button variant="primary" type="submit" className="w-100">
                        Sign in
                      </Button>
                    </Form>

                    <div className="d-flex justify-content-center align-items-center mt-4">
                      <span className="fw-normal">
                        Not registered?
                        <Card.Link as={Link} to="/register" className="fw-bold">
                          {` Create account `}
                        </Card.Link>
                      </span>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
            <div className="text-center mt-4"><Card.Link as={Link} to="/change-password">Change Password</Card.Link></div>
          </div>
        </div>
      </section>
    </main>
  );
}
