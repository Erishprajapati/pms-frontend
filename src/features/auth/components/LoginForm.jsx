import { useState } from "react";

export default function LoginForm() {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [errors, setErrors] = useState(null);
const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
e.preventDefault();
setLoading(true);
setErrors(null);

try {
    const res = await fetch(
    "https://api-deployment-6jj9.onrender.com/api/auth/login/",
    {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    }
    );

    const data = await res.json();

    if (!res.ok) {
    // Backend returns: { "email":[...], "password":[...] }
    setErrors(data);
    setLoading(false);
    return;
    }

    // If successful, token will be in data (depends on API)
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
<form onSubmit={handleSubmit} style={{ width: "300px" }}>
    <h2>Login</h2>

    <input
    type="email"
    placeholder="Email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    />
    {errors?.email && <p style={{ color: "red" }}>{errors.email[0]}</p>}

    <br />

    <input
    type="password"
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    />
    {errors?.password && <p style={{ color: "red" }}>{errors.password[0]}</p>}

    {errors?.general && <p style={{ color: "red" }}>{errors.general}</p>}

    <br />

    <button type="submit" disabled={loading}>
    {loading ? "Logging in…" : "Login"}
    </button>
</form>
);
}
