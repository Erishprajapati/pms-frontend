// utils/auth.js
export const isAuthenticated = () => {
    return !!localStorage.getItem("token"); // or however you store auth state
  };