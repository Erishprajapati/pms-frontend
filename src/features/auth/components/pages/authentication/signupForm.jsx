import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Only send fields that work in Postman
    const payload = {
      full_name: fullName,
      email: email,
      phone: phone,        // string is OK (Django CharField)
      password: password,
    };

    try {
      const response = await fetch("https://api-deployment-6jj9.onrender.com/api/auth/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Backend errors like { phone: [...], email: [...] }
        setErrors(data);
        setLoading(false);
        return;
      }

      alert("Signup successful!");
      navigate("/login");
    } catch (err) {
      console.error("Network error:", err);
      setErrors({ non_field_errors: ["Unable to reach server. Please try again."] });
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sign Up</h2>

      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full Name"
        required
      />
      {errors.full_name && <p style={{ color: "red" }}>{errors.full_name[0]}</p>}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      {errors.email && <p style={{ color: "red" }}>{errors.email[0]}</p>}

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        required
      />
      {errors.phone && <p style={{ color: "red" }}>{errors.phone[0]}</p>}

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {errors.password && <p style={{ color: "red" }}>{errors.password[0]}</p>}

      {errors.non_field_errors && (
        <p style={{ color: "red" }}>{errors.non_field_errors[0]}</p>
      )}

      <button type="submit" disabled={loading}>
        {loading ? "Signing up..." : "Sign Up"}
      </button>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}