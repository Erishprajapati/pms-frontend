import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors(null);
  
    try {
      const res = await fetch(
        "https://api-deployment-6jj9.onrender.com/api/auth/login/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        setErrors(data);
        setLoading(false);
        return;
      }
  
      // ✅ CORRECT: role is top-level, not inside "user"
      if (!data.access_token || data.role == null) {
        throw new Error("Invalid response from server");
      }
  
      // Save tokens
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_role", data.role.toString()); // optional
      localStorage.setItem("user_id", data.user_id);
  
      // ✅ Redirect based on numeric role
      const role = data.role;
      if (role === 1) {
        navigate("/admin");
      } else if ([2, 4, 5].includes(role)) {
        navigate("/employee");
      } else if (role === 3) {
        navigate("/hr");
      } else {
        navigate("/employee");
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="login-container">
      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      {errors?.email && <p className="error">{errors.email[0]}</p>}

      <div className="password-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          disabled={loading}
        >
          {showPassword ? (
            // Eye-off icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 9.9a3 3 0 1 1 4.24 4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          ) : (
            // Eye icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          )}
        </button>
      </div>
      {errors?.password && <p className="error">{errors.password[0]}</p>}
      {errors?.general && <p className="error">{errors.general}</p>}
      {errors?.detail && <p className="error">{errors.detail}</p>} {/* Django-style error */}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? "Logging in…" : "Login"}
      </button>
      <p className="signup-link">
        Don’t have an account? <a href="/signup">Create one</a>
      </p>
    </form>
  );
}