import { useState, useEffect } from "react";
import PropTypes from "prop-types";

export default function EmployeeForm({ employee, submitLabel = "Save", onSubmit }) {
  // Deep clone helper
  const deepClone = (obj) => {
    if (!obj) return { user: {} };
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      console.error("Failed to deep clone object:", e);
      return { ...obj, user: { ...obj.user } };
    }
  };

  const [form, setForm] = useState(deepClone(employee));

  // Sync form when employee prop changes
  useEffect(() => {
    setForm(deepClone(employee));
  }, [employee]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => {
      // Handle nested `user` fields
      if (name.startsWith("user.")) {
        const userField = name.split(".")[1];
        return {
          ...prev,
          user: {
            ...prev.user,
            [userField]: type === "number" ? (value === "" ? "" : parseFloat(value)) : value,
          },
        };
      }
      // Handle top-level fields
      return {
        ...prev,
        [name]: type === "number" ? (value === "" ? "" : parseFloat(value)) : value,
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {form.id != null && (
        <div>
          <label>ID:</label>
          <input name="id" value={form.id} type="text" disabled />
        </div>
      )}

      <div>
        <label>Username:</label>
        <input
          name="username"
          value={form.username || ""}
          onChange={handleChange}
          type="text"
          required
        />
      </div>

      <div>
        <label>Phone Number:</label>
        <input
          name="phone_number"
          value={form.phone_number || ""}
          onChange={handleChange}
          type="text"
          required
        />
      </div>

      <div>
        <label>Date of Birth:</label>
        <input
          name="dob"
          value={form.dob || ""}
          onChange={handleChange}
          type="date"
          required
        />
      </div>

      <div>
        <label>Employee Code:</label>
        <input
          name="employee_code"
          value={form.employee_code || ""}
          onChange={handleChange}
          type="text"
          required
        />
      </div>

      <div>
        <label>Department:</label>
        <input
          name="department"
          value={form.department || ""}
          onChange={handleChange}
          type="number"
          required
        />
      </div>

      <div>
        <label>Job Title:</label>
        <input
          name="job_title"
          value={form.job_title || ""}
          onChange={handleChange}
          type="number"
          required
        />
      </div>

      <div>
        <label>Employee Type:</label>
        <input
          name="employee_type"
          value={form.employee_type || ""}
          onChange={handleChange}
          type="number"
          required
        />
      </div>

      <div>
        <label>Employee Status:</label>
        <input
          name="employee_status"
          value={form.employee_status || ""}
          onChange={handleChange}
          type="number"
          required
        />
      </div>

      <div>
        <label>Current Address:</label>
        <input
          name="current_address"
          value={form.current_address || ""}
          onChange={handleChange}
          type="text"
          required
        />
      </div>

      <div>
        <label>Permanent Address:</label>
        <input
          name="permanent_address"
          value={form.permanent_address || ""}
          onChange={handleChange}
          type="text"
          required
        />
      </div>

      <div>
        <label>Gender:</label>
        <select name="gender" value={form.gender || ""} onChange={handleChange} required>
          <option value="">Select...</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>
      </div>

      <div>
        <label>Email:</label>
        <input
          name="email"
          value={form.email || ""}
          onChange={handleChange}
          type="email"
          required
        />
      </div>

      <div>
        <label>Current Salary:</label>
        <input
          name="current_salary"
          value={form.current_salary || ""}
          onChange={handleChange}
          type="number"
          step="0.01"
          required
        />
      </div>

      <fieldset>
        <legend>User Info</legend>
        <div>
          <label>First Name:</label>
          <input
            name="user.first_name"
            value={form.user?.first_name || ""}
            onChange={handleChange}
            type="text"
          />
        </div>
        <div>
          <label>Last Name:</label>
          <input
            name="user.last_name"
            value={form.user?.last_name || ""}
            onChange={handleChange}
            type="text"
          />
        </div>
        <div>
          <label>User Email:</label>
          <input
            name="user.email"
            value={form.user?.email || ""}
            onChange={handleChange}
            type="email"
          />
        </div>
        <div>
          <label>User Username:</label>
          <input
            name="user.username"
            value={form.user?.username || ""}
            onChange={handleChange}
            type="text"
          />
        </div>
        <div>
          <label>User Password:</label>
          <input
            name="user.password"
            value={form.user?.password || ""}
            onChange={handleChange}
            type="password"
          />
        </div>
      </fieldset>

      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
        {submitLabel}
      </button>
    </form>
  );
}

// PropTypes for safety (optional)
EmployeeForm.propTypes = {
  employee: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    username: PropTypes.string,
    phone_number: PropTypes.string,
    dob: PropTypes.string,
    employee_code: PropTypes.string,
    department: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    job_title: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    employee_type: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    employee_status: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    current_address: PropTypes.string,
    permanent_address: PropTypes.string,
    gender: PropTypes.string,
    email: PropTypes.string,
    current_salary: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    user: PropTypes.shape({
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      email: PropTypes.string,
      username: PropTypes.string,
      password: PropTypes.string,
    }),
  }),
  submitLabel: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
};