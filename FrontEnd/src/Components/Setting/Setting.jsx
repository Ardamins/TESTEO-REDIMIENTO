import React, { useState, useContext, useEffect } from "react";
import "./Setting.css";
import DashboardHeader from "../DashBoardHeader/DashBoardHeader";
import { AdminContext } from "../../Context/AdminContext";

const Setting = () => {
  const { admin, updateProfile } = useContext(AdminContext);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (admin) {
      setFirstName(admin.firstName || "");
      setLastName(admin.lastName || "");
      setEmail(admin.email || "");
    }
  }, [admin]);

  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const payload = {
      firstName,
      lastName,
      email,
      newPassword: password || undefined,
      confirmPassword: confirmPassword || undefined,
    };

    // Show tooltip/confirmation before updating
    alert(
      "⚠️ Note: You will be automatically logged out after updating your profile."
    );

    const res = await updateProfile(payload);

    if (res.success) {
      alert(res.message + res.shouldLogout || "Profile updated successfully");

      if (res.shouldLogout) return;
    } else {
      alert(res.message || "Failed to update profile");
    }
  };

  return (
    <div className="settings-container">
      <DashboardHeader title="Setting" showSearch={false} />
      <hr />
      <div className="content">
        <div className="settings-header">
          <button className="tab active">Edit Profile</button>
        </div>
        <hr />
        <div className="settings-content">
          <div className="profile-tab">
            <div className="form-group">
              <label>First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} disabled />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button className="save-btn" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setting;
