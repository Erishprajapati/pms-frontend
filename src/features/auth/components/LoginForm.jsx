import { useState } from "react";

export default function LoginForm() {
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

      localStorage.setItem("access_token", data.access);
      alert("Login successful");
      setLoading(false);
    } catch (err) {
      console.log("Error:", err);
      setErrors({ general: "Something went wrong" });
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
      />
      {errors?.email && <p>{errors.email[0]}</p>}

      <div className="password-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? "🙈" : "👁️"}
        </button>
      </div>
      {errors?.password && <p>{errors.password[0]}</p>}
      {errors?.general && <p>{errors.general}</p>}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? "Logging in…" : "Login"}
      </button>
    </form>
  );
}
