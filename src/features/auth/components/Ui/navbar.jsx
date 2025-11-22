import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState({ name: "", email: "" });

  const navigate = useNavigate();

  // Load user from localStorage or JWT
  useEffect(() => {
    const loadUser = () => {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          const name = u.name || [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "";
          const email = u.email || "";
          setUser({ name, email });
          return;
        }
      } catch {}

      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          const name = payload.name || [payload.first_name, payload.last_name].filter(Boolean).join(" ") || "";
          const email = payload.email || "";
          setUser({ name, email });
        } catch {}
      }
    };

    loadUser();
  }, []);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const goToSettings = () => {
    navigate("/settings");
  };

  // Inline styles
  const styles = {
    navbar: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      backgroundColor: "#fff",
      padding: "0 1rem",
      height: "50px",
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
    userDropdown: {
      cursor: "pointer",
      position: "relative",
    },
    dropdownHeader: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      fontWeight: 500,
      color: "#333",
      fontSize: "14px",
    },
    dropdownContent: {
      position: "absolute",
      top: "100%",
      right: 0,
      backgroundColor: "#fff",
      border: "1px solid #e0e0e0",
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      minWidth: "160px",
      marginTop: "4px",
      padding: "8px 0",
    },
    dropdownItem: {
      padding: "8px 16px",
      fontSize: "14px",
      cursor: "pointer",
      color: "#333",
    },
    dropdownItemHover: {
      backgroundColor: "#f5f5f5",
    },
  };

  return (
    <>
      <nav style={styles.navbar}>
        <div style={styles.userDropdown} onClick={toggleDropdown}>
          <div style={styles.dropdownHeader}>
            <span>{user.name || user.email || "Account"}</span>
            <span style={{ fontSize: "0.7rem", color: "#666" }}>▼</span>
          </div>

          {dropdownOpen && (
            <div style={styles.dropdownContent}>
              <div
                style={styles.dropdownItem}
                onClick={goToSettings}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#f5f5f5")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
              >
                Settings
              </div>
              <div
                style={styles.dropdownItem}
                onClick={handleLogout}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#f5f5f5")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
              >
                Log Out
              </div>
            </div>
          )}
        </div>
      </nav>
      <div style={{ height: "50px" }}></div>
    </>
  );
}