import SignupForm from "./pages/authentication/signupForm";
import "./styles/signupform.css";
// ← must match actual filename

export default function SignupPage() {
  return (
    <div className="signup-page">
      <div className="signup-card">
        <SignupForm />
      </div>
    </div>
  );
}