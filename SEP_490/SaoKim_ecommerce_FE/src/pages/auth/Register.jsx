import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faUnlockAlt,
  faEye,
  faEyeSlash,
  faArrowRight,
  faPhone,
  faCalendar,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import { Form, Button, InputGroup } from "@themesberg/react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    dob: "",
    image: "",
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setFieldError = (name, message) =>
    setErrors((prev) => ({ ...prev, [name]: message || "" }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setFieldError(name, "");
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const validateAll = () => {
    const v = {};
    if (!form.fullName.trim()) v.fullName = "Họ và tên là bắt buộc.";
    if (!form.email.trim()) v.email = "Email là bắt buộc.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email))
      v.email = "Email không hợp lệ.";

    if (!form.password) v.password = "Mật khẩu là bắt buộc.";
    else if (form.password.length < 8)
      v.password = "Mật khẩu tối thiểu 8 ký tự.";
    else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password))
      v.password = "Mật khẩu phải có ít nhất 1 chữ cái và 1 chữ số.";

    if (!form.confirmPassword)
      v.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    else if (form.password !== form.confirmPassword)
      v.confirmPassword = "Mật khẩu xác nhận không khớp.";

    if (!form.phoneNumber.trim())
      v.phoneNumber = "Số điện thoại là bắt buộc.";
    else if (!/^\d{9,11}$/.test(form.phoneNumber))
      v.phoneNumber = "Số điện thoại không hợp lệ.";

    if (!form.dob.trim()) v.dob = "Ngày sinh là bắt buộc.";
    if (!form.image) v.image = "Ảnh đại diện là bắt buộc.";

    setErrors(v);
    return Object.keys(v).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");
    setSuccess("");

    if (!validateAll()) {
      setTouched({
        fullName: true,
        email: true,
        password: true,
        confirmPassword: true,
        phoneNumber: true,
        dob: true,
        image: true,
      });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.fullName);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("role", "customer");
      formData.append("phoneNumber", form.phoneNumber);
      formData.append("dob", form.dob);
      formData.append("image", form.image);

      const res = await fetch("https://localhost:7278/api/auth/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.errors) {
          const fieldErrors = {};

          Object.keys(data.errors).forEach((key) => {
            let fieldName = key.charAt(0).toLowerCase() + key.slice(1); 
            if (fieldName === "dOB") fieldName = "dob";
            fieldErrors[fieldName] = data.errors[key][0];
          });

          setErrors(fieldErrors);
          setTouched((prev) => ({
            ...prev,
            fullName: true,
            email: true,
            password: true,
            confirmPassword: true,
            phoneNumber: true,
            dob: true,
            image: true,
          }));
        } else {
          setGeneralError(data?.message || "Đăng ký thất bại.");
        }
        return;
      }

      setSuccess("Đăng ký thành công! Đang chuyển hướng...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setGeneralError("Máy chủ gặp sự cố. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      illustration={BgImage}
      badge="Sao Kim"
      headline="Gia nhập cộng đồng yêu ánh sáng Sao Kim"
      subHeadline="Tạo tài khoản để tích lũy điểm thưởng, theo dõi đơn hàng và nhận ưu đãi dành riêng cho bạn."
      insights={[
        "Ưu đãi độc quyền cho hội viên Sao Kim",
        "Lưu danh sách đèn yêu thích trong tích tắc",
        "Nhận thông báo giao hàng và bảo hành tức thì",
      ]}
      footerNote="Sao Kim Lighting – nguồn sáng chuẩn châu Âu cho mọi không gian sống."
      backLink={{ to: "/", label: "Quay lại trang chủ" }}
    >
      <div className="auth-content__header">
        <h1 className="auth-content__title">Tạo tài khoản</h1>
        <p className="auth-content__subtitle">
          Hoàn thiện thông tin để bắt đầu hành trình mua sắm ánh sáng đẳng cấp cùng Sao Kim.
        </p>
      </div>

      {generalError && (
        <div className="alert alert-danger text-center">{generalError}</div>
      )}
      {success && (
        <div className="alert alert-success text-center">{success}</div>
      )}

      <Form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Form.Group>
          <Form.Label>Họ và tên</Form.Label>
          <InputGroup >
            <InputGroup.Text><FontAwesomeIcon icon={faUser} /></InputGroup.Text>
            <Form.Control
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              onBlur={handleBlur}
              isInvalid={touched.fullName && !!errors.fullName}
              placeholder="Nguyễn Văn A"
            />
            <Form.Control.Feedback type="invalid">
              {errors.fullName}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Form.Group>
          <Form.Label>Email</Form.Label>
          <InputGroup >
            <InputGroup.Text><FontAwesomeIcon icon={faEnvelope} /></InputGroup.Text>
            <Form.Control
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              isInvalid={touched.email && !!errors.email}
              placeholder="example@saokim.vn"
            />
            <Form.Control.Feedback type="invalid">
              {errors.email}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Form.Group>
          <Form.Label>Số điện thoại</Form.Label>
          <InputGroup >
            <InputGroup.Text><FontAwesomeIcon icon={faPhone} /></InputGroup.Text>
            <Form.Control
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              isInvalid={touched.phoneNumber && !!errors.phoneNumber}
              placeholder="0123456789"
            />
            <Form.Control.Feedback type="invalid">
              {errors.phoneNumber}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Form.Group>
          <Form.Label>Ngày sinh</Form.Label>
          <InputGroup >
            <InputGroup.Text><FontAwesomeIcon icon={faCalendar} /></InputGroup.Text>
            <Form.Control
              name="dob"
              type="date"
              value={form.dob}
              onChange={handleChange}
              onBlur={handleBlur}
              isInvalid={touched.dob && !!errors.dob}
            />
            <Form.Control.Feedback type="invalid">
              {errors.dob}
            </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Form.Group>
          <Form.Label>Ảnh đại diện</Form.Label>
          <InputGroup >
            <InputGroup.Text><FontAwesomeIcon icon={faImage} /></InputGroup.Text>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              isInvalid={touched.image && !!errors.image}
            />
            <Form.Control.Feedback type="invalid">
              {errors.image}
            </Form.Control.Feedback>
          </InputGroup>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Xem trước"
              style={{ marginTop: 10, width: 120, borderRadius: 8 }}
            />
          )}
        </Form.Group>

        <Form.Group>
          <Form.Label>Mật khẩu</Form.Label>
          <InputGroup >
            <InputGroup.Text>
              <FontAwesomeIcon icon={faUnlockAlt} />
            </InputGroup.Text>
            <Form.Control name="password" type={showPassword ? "text" : "password"} placeholder="Tối thiểu 8 ký tự" value={form.password}
              onChange={handleChange} onBlur={handleBlur} isInvalid={touched.password && !!errors.password} />
            <Button type="button" variant="link" onClick={() => setShowPassword((p) => !p)} >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </Button> <Form.Control.Feedback type="invalid"> {errors.password} </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Form.Group>
          <Form.Label>Xác nhận mật khẩu</Form.Label>
          <InputGroup >
            <InputGroup.Text>
              <FontAwesomeIcon icon={faUnlockAlt} />
            </InputGroup.Text>
            <Form.Control name="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="Nhập lại mật khẩu" value={form.confirmPassword}
              onChange={handleChange} onBlur={handleBlur} isInvalid={touched.confirmPassword && !!errors.confirmPassword} />
            <Button type="button" variant="link" onClick={() => setShowConfirm((p) => !p)} >
              <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} />
            </Button>
            <Form.Control.Feedback type="invalid"> {errors.confirmPassword} </Form.Control.Feedback>
          </InputGroup>
        </Form.Group>

        <Button
          variant="primary"
          type="submit"
          className="auth-submit w-100 mt-3"
          disabled={submitting}
        >
          {submitting ? "Đang xử lý..." : "Tạo tài khoản"}
          {!submitting && <FontAwesomeIcon icon={faArrowRight} />}
        </Button>

        <Link to="/" className="btn auth-secondary w-100 mt-2">
          Về trang chủ
        </Link>
      </Form>

      <div className="auth-meta mt-3">
        Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
      </div>
    </AuthLayout>
  );
}
