import React, { useState, useEffect } from "react";
import { User, Mail, Lock, X, CheckCircle } from "lucide-react";
import "./LoginModal.css";

function LoginModal({ onClose, onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "");
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill in email and password.");
      return;
    }
    if (isRegistering && !formData.name) {
      setError("Please fill in your name to register.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegistering
        ? "http://localhost:5000/api/auth/register"
        : "http://localhost:5000/api/auth/login";

      const payload = isRegistering
        ? { name: formData.name.trim(), email: formData.email.trim(), password: formData.password }
        : { email: formData.email.trim(), password: formData.password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || (isRegistering ? "Registration failed" : "Login failed"));

      // ── Save JWT token + user info to localStorage ────────────────────────
      localStorage.setItem("jv_token",       data.token);
      localStorage.setItem("jv_logged_in",   "true");
      localStorage.setItem("jv_user_id",     data.user._id);
      localStorage.setItem("jv_user_name",   data.user.name);
      localStorage.setItem("jv_user_email",  data.user.email);
      localStorage.setItem("jv_user_role",   data.user.role);
      localStorage.setItem("jv_member_since", data.user.memberSince);
      // ─────────────────────────────────────────────────────────────────────

      setLoading(false);
      setSuccess(true);
      setTimeout(() => onLoginSuccess(), 1000);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Close */}
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Brand */}
        <div className="modal-brand">
          <div className="modal-logo">🏨</div>
          <h1 className="modal-title">Prime Stay</h1>
          <p className="modal-subtitle">Customer Portal</p>
        </div>

        {success ? (
          <div className="modal-success">
            <div className="success-icon">✅</div>
            <h2>{isRegistering ? "Registration Complete!" : `Welcome, ${formData.name.split(" ")[0] || "Back"}!`}</h2>
            <p>{isRegistering ? "Account created successfully." : "Login successful. Redirecting…"}</p>
          </div>
        ) : (
          <>
            <h2 className="modal-heading">{isRegistering ? "Create an Account" : "Welcome Back"}</h2>
            <p className="modal-desc">{isRegistering ? "Sign up to book your stay." : "Sign in to manage your bookings."}</p>

            <form onSubmit={handleSubmit} className="modal-form">
              {isRegistering && (
                <div className="form-group">
                  <label>Your Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><User size={18} /></span>
                    <input type="text" name="name" placeholder="e.g. Rahul Sharma"
                      value={formData.name} onChange={handleChange} className="form-input" autoFocus />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={18} /></span>
                  <input type="email" name="email" placeholder="you@example.com"
                    value={formData.email} onChange={handleChange} className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={18} /></span>
                  <input type="password" name="password" placeholder="Enter password"
                    value={formData.password} onChange={handleChange} className="form-input" />
                </div>
              </div>

              {error && <div className="modal-error">{error}</div>}

              <button type="submit" className="modal-btn" disabled={loading}>
                {loading ? <span className="spinner"></span> : (isRegistering ? "Create Account →" : "Sign In →")}
              </button>
            </form>

            <div className="modal-divider">or</div>
            <p className="modal-register">
              {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError(""); setFormData({ name: "", email: "", password: "" }); }}
                className="register-link"
                style={{ background: "none", border: "none", font: "inherit", cursor: "pointer", padding: 0 }}
              >
                {isRegistering ? "Sign In" : "Register"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginModal;
