import React, { useState, useContext } from "react";
import "./LeftComponent.css";
import { useNavigate } from "react-router-dom";
import { AdminContext } from "../../../Context/AdminContext";

const LeftComponent = () => {
  const { loginAdmin, registerAdmin, sendOtp, verifyOtp, resetPassword } =
    useContext(AdminContext);

  const [formType, setFormType] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (formType === "login") {
      const res = await loginAdmin(form.email, form.password);
      setMsg(res.message);
      if (res.success) navigate("/dashboard");
    }

    if (formType === "signup") {
      if (form.password !== form.confirmPassword) {
        setMsg("Passwords do not match");
        return;
      }
      const res = await registerAdmin(form.name, form.email, form.password);
      setMsg(res.message);
      if (res.success) navigate("/dashboard");
    }

    if (formType === "forgot") {
      const res = await sendOtp(form.email);
      setMsg(res.message);
      if (res.success) setFormType("otp");
    }

    if (formType === "otp") {
      const res = await verifyOtp(form.email, form.otp);
      setMsg(res.message);
      if (res.success) setFormType("reset");
    }

    if (formType === "reset") {
      if (form.newPassword !== form.confirmNewPassword) {
        setMsg("Passwords do not match");
        return;
      }
      const res = await resetPassword(
        form.email,
        form.newPassword,
        form.confirmNewPassword
      );
      setMsg(res.message);
      if (res.success) setFormType("login");
    }
  };

  const renderForm = () => {
    switch (formType) {
      case "login":
        return (
          <form className="form-box" onSubmit={handleSubmit}>
            <div className="form-title">
              <h2>Log in to your account</h2>
              <p>Welcome back! Please enter your details.</p>
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="Example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="at least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <p className="link">
              <span onClick={() => setFormType("forgot")}>
                Forgot Password?
              </span>
            </p>
            <button className="btn" type="submit">
              {"Sign In"}
            </button>
            <p className="link Link">
              Don’t have an account?{" "}
              <span onClick={() => setFormType("signup")}>Sign up</span>
            </p>
            {msg && <p className="msg">{msg}</p>}
          </form>
        );

      case "signup":
        return (
          <form className="form-box" onSubmit={handleSubmit}>
            <div className="form-title">
              <h2>Create an account</h2>
              <p>Start inventory management.</p>
            </div>
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="Example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Create Password</label>
              <input
                type="password"
                placeholder="at least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="at least 8 characters"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
              />
            </div>
            <button className="btn" type="submit">
              {"Sign up"}
            </button>
            <p className="link Link">
              Already have an account?{" "}
              <span onClick={() => setFormType("login")}>Sign in</span>
            </p>
            {msg && <p className="msg">{msg}</p>}
          </form>
        );

      case "forgot":
        return (
          <form className="form-box" onSubmit={handleSubmit}>
            <div className="form-title">
              <h2>Reset Password</h2>
              <p className="subheading">
                Please enter your registered email ID to receive an OTP
              </p>
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <button className="btn" type="submit">
              {"Send OTP"}
            </button>
            <p className="link Link">
              Remembered your password?{" "}
              <span onClick={() => setFormType("login")}>Sign in</span>
            </p>
            {msg && <p className="msg">{msg}</p>}
          </form>
        );

      case "otp":
        return (
          <form className="form-box" onSubmit={handleSubmit}>
            <div className="form-title">
              <h2>Enter Your OTP</h2>
              <p className="subheading">
                We’ve sent a 6-digit OTP to your registered email
              </p>
            </div>
            <div className="field">
              <input
                type="text"
                placeholder="Enter OTP"
                value={form.otp}
                onChange={(e) => setForm({ ...form, otp: e.target.value })}
              />
            </div>
            <button className="btn" type="submit">
              {"Confirm"}
            </button>
            {msg && <p className="msg">{msg}</p>}
          </form>
        );

      case "reset":
        return (
          <form className="form-box" onSubmit={handleSubmit}>
            <div className="form-title">
              <h2>Create New Password</h2>
              <p>
                Today is a new day. It's your day. You shape it. Sign in to
                start managing your projects.
              </p>
            </div>
            <div className="field">
              <label>Enter New Password</label>
              <input
                type="password"
                placeholder="at least 8 characters"
                value={form.newPassword}
                onChange={(e) =>
                  setForm({ ...form, newPassword: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="at least 8 characters"
                value={form.confirmNewPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmNewPassword: e.target.value })
                }
              />
            </div>
            <button className="btn" type="submit">
              {"Reset Password"}
            </button>
            {msg && <p className="msg">{msg}</p>}
          </form>
        );

      default:
        return null;
    }
  };

  return <div className="leftComponent left">{renderForm()}</div>;
};

export default LeftComponent;
