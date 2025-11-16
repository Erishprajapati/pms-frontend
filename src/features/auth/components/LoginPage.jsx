import LoginForm from "../components/LoginForm";
import "./styles/LoginPage.css";

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="image-container"></div>
      <div className="form-container">
        <div className="login-card">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
