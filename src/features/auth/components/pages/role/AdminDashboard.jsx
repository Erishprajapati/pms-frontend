import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../../../components/Ui/DataTable"; // Make sure path is correct

const API_BASE_URL = "https://api-deployment-6jj9.onrender.com/api";

export default function AdminDashboard() {
  const [loading, setLoading] = useState({ page: true });
  const [error, setError] = useState(null);

  const [projectsList, setProjectsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [overdueTasksList, setOverdueTasksList] = useState([]);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);

  // Employee table state
  const [employeesRows, setEmployeesRows] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [empCurrentPage, setEmpCurrentPage] = useState(1);
  const [empTotalItems, setEmpTotalItems] = useState(0);
  const [empTotalPages, setEmpTotalPages] = useState(1);
  const [empNextUrl, setEmpNextUrl] = useState(null);
  const [empPrevUrl, setEmpPrevUrl] = useState(null);
  const [empSortField, setEmpSortField] = useState("id");
  const [empSortDirection, setEmpSortDirection] = useState("desc");

  const navigate = useNavigate();

  // ========== Auth Helpers ==========
  const refreshAccessToken = async () => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      localStorage.setItem("token", data.access);
      return data.access;
    } catch {
      return null;
    }
  };

  const fetchAuthenticated = async (url, options = {}) => {
    let token = localStorage.getItem("token");
    if (!token) throw new Error("Authentication token missing");

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    let response = await fetch(url, config);

    if (response.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) throw new Error("Session expired. Please log in again.");
      config.headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(url, config);
    }

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (response.status === 204) return null;
    return await response.json();
  };

  // ========== Employee Table Logic ==========
  const fetchEmployeesAdmin = useCallback(
    async (url = null) => {
      setEmpLoading(true);
      try {
        let apiUrl;
        if (url) {
          apiUrl = url;
        } else {
          const params = new URLSearchParams();
          params.append("limit", "10");
          params.append("offset", ((empCurrentPage - 1) * 10).toString());
          if (empSearchQuery.trim()) params.append("search", empSearchQuery.trim());
          const ordering = (empSortDirection === "desc" ? "-" : "") + empSortField;
          params.append("ordering", ordering);
          apiUrl = `${API_BASE_URL}/employees/employee/?${params.toString()}`;
        }

        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const results = Array.isArray(data.results) ? data.results : data || [];

        setEmpTotalItems(data.count || results.length || 0);
        setEmpNextUrl(data.next);
        setEmpPrevUrl(data.previous);

        if (url && url.includes("offset=")) {
          const offset = new URL(url).searchParams.get("offset") || 0;
          setEmpCurrentPage(Math.floor(parseInt(offset) / 10) + 1);
        }

        setEmpTotalPages(Math.ceil((data.count || 1) / 10) || 1);

        const processed = results.map((emp, idx) => {
          const id = emp.id ?? idx + 1;
          const name =
            emp.name ||
            emp.full_name ||
            [emp.first_name, emp.last_name].filter(Boolean).join(" ") ||
            (emp.user && [emp.user.first_name, emp.user.last_name].filter(Boolean).join(" ")) ||
            emp.username ||
            emp.email ||
            "Unknown Employee";
          const phone =
            emp.phone_number ||
            emp.phone ||
            (emp.user?.phone_number || emp.user?.phone) ||
            "N/A";
          return { id, name, employee_code: emp.employee_code || "—", phone_number: phone };
        });

        setEmployeesRows(processed);
      } catch (err) {
        console.error("Failed to load employees:", err);
        setEmployeesRows([]);
      } finally {
        setEmpLoading(false);
      }
    },
    [empCurrentPage, empSearchQuery, empSortField, empSortDirection]
  );

  const handleEmpSort = (key) => {
    if (empSortField === key) {
      setEmpSortDirection(empSortDirection === "asc" ? "desc" : "asc");
    } else {
      setEmpSortField(key);
      setEmpSortDirection("asc");
    }
    setEmpCurrentPage(1);
  };

  const goToEmpNextPage = () => empNextUrl && fetchEmployeesAdmin(empNextUrl);
  const goToEmpPreviousPage = () => empPrevUrl && fetchEmployeesAdmin(empPrevUrl);

  useEffect(() => {
    const timer = setTimeout(() => {
      setEmpCurrentPage(1);
      fetchEmployeesAdmin();
    }, 400);
    return () => clearTimeout(timer);
  }, [empSearchQuery, fetchEmployeesAdmin]);

  useEffect(() => {
    setEmpCurrentPage(1);
    fetchEmployeesAdmin();
  }, [empSortField, empSortDirection, fetchEmployeesAdmin]);

  // ========== Main Dashboard Data ==========
  const fetchDashboardData = async () => {
    setLoading((prev) => ({ ...prev, page: true }));
    setError(null);
    try {
      const [empRes, projRes, leaveRes, deptRes] = await Promise.all([
        fetchAuthenticated(`${API_BASE_URL}/employees/employee/`).catch(() => ({ results: [] })),
        fetchAuthenticated(`${API_BASE_URL}/projects/projects/`).catch(() => ({ results: [] })),
        fetchAuthenticated(`${API_BASE_URL}/employees/leave/`).catch(() => ({ results: [] })),
        fetchAuthenticated(`${API_BASE_URL}/admin/department/`).catch(() => ({ results: [] })),
      ]);

      const employees = empRes.results || empRes;
      const projects = projRes.results || projRes;
      const leaves = leaveRes.results || leaveRes;
      const departments = deptRes.results || deptRes;

      // Process leaves
      const pending = leaves.filter((l) => l.status?.toLowerCase() === "pending").length;
      setPendingLeavesCount(pending);

      // Lookups
      const deptMap = departments.reduce((acc, d) => ({ ...acc, [d.id]: d.name }), {});
      const empMap = employees.reduce((acc, e) => {
        const name = e.name || [e.first_name, e.last_name].filter(Boolean).join(" ") || e.username;
        return { ...acc, [e.id]: name || "Unknown" };
      }, {});

      // Process projects & tasks
      const overdueTasks = [];
      const enrichedProjects = await Promise.all(
        projects.map(async (proj) => {
          try {
            const tasksRes = await fetchAuthenticated(
              `${API_BASE_URL}/projects/projects/${proj.id}/tasks/`
            );
            const tasks = tasksRes.results || tasksRes;
            const today = new Date();
            const overdue = tasks.filter(
              (t) => t.due_date && new Date(t.due_date) < today && t.status !== "Completed"
            );
            overdue.forEach((t) =>
              overdueTasks.push({ ...t, project_name: proj.name, project_id: proj.id })
            );
            return {
              ...proj,
              manager_name: empMap[proj.manager] || "N/A",
              overdue_count: overdue.length,
              status: proj.status || (Math.random() > 0.8 ? "On Hold" : "Active"),
            };
          } catch {
            return {
              ...proj,
              manager_name: empMap[proj.manager] || "N/A",
              overdue_count: 0,
              status: proj.status || "Active",
            };
          }
        })
      );

      setProjectsList(enrichedProjects);
      setOverdueTasksList(overdueTasks);
      setEmployeesList(
        employees.map((e) => ({
          ...e,
          name: empMap[e.id],
          department_name: deptMap[e.department] || "N/A",
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, page: false }));
    }
  };

  const getProjectStatusClass = (status) => {
    if (!status) return "bg-blue-200 text-blue-800";
    const lower = status.toLowerCase();
    if (lower === "completed") return "bg-green-200 text-green-800";
    if (lower === "on hold") return "bg-yellow-200 text-yellow-800";
    if (lower === "archived") return "bg-gray-200 text-gray-800";
    return "bg-blue-200 text-blue-800";
  };

  const deleteProject = async (id) => {
    if (!confirm(`Are you sure you want to delete Project ID: ${id}?`)) return;
    try {
      await fetchAuthenticated(`${API_BASE_URL}/projects/projects/${id}/`, { method: "DELETE" });
      await fetchDashboardData();
    } catch (err) {
      alert("Failed to delete project.");
    }
  };

  // ========== Lifecycle ==========
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ========== Render ==========
  if (loading.page) {
    return (
      <div className="admin-dashboard bg-gray-50 min-h-screen p-4 lg:p-8">
        <div className="flex justify-center items-center h-80">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-400 border-t-transparent"></div>
          <p className="ml-4 text-indigo-600 font-medium">Loading all dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard bg-gray-50 min-h-screen p-4 lg:p-8">
        <div className="text-center p-8 text-red-600 bg-red-100 border border-red-300 rounded-lg shadow-md mb-8">
          <div className="text-4xl mb-4">🚨</div>
          <p className="text-lg font-medium">Authentication or Data Fetch Error</p>
          <p className="text-sm mt-2">Could not load dashboard data. Please check your token.</p>
          <p className="text-xs mt-1 text-red-700">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard bg-gray-50 min-h-screen p-4 lg:p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="overview-section bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
            📊 Quick Metrics Overview
          </h2>
          <div className="kpi-cards-grid">
            <KpiCard title="Total Projects" value={projectsList.length} icon="📁" color="blue" />
            <KpiCard title="Total Employees" value={employeesList.length} icon="👥" color="green" />
            <KpiCard
              title="Overdue Tasks"
              value={overdueTasksList.length}
              icon="⚠️"
              color="red"
            />
            <KpiCard
              title="Pending Leaves"
              value={pendingLeavesCount}
              icon="📅"
              color="yellow"
            />
          </div>
        </div>

        {/* Main Content + Sidebar */}
        <div className="dashboard-sections flex flex-col lg:flex-row gap-6">
          <div className="main-content flex-3 w-full lg:w-3/4 flex flex-col space-y-6">
            {/* Projects Table */}
            <div className="card bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="card__header mb-4 flex justify-between items-center">
                <h4 className="card__title text-xl font-bold text-indigo-800">Projects Directory</h4>
                <button
                  onClick={() => navigate("/projects/create")}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
                >
                  + New Project
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      <th className="px-6 py-3">Project</th>
                      <th className="px-6 py-3">Manager</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Overdue Tasks</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projectsList.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {project.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {project.manager_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getProjectStatusClass(
                              project.status
                            )}`}
                          >
                            {project.status || "Active"}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                            project.overdue_count > 0 ? "text-red-500" : "text-green-500"
                          }`}
                        >
                          {project.overdue_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => navigate(`/projects/${project.id}/files`)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            View
                          </button>
                          <button
                            onClick={() => deleteProject(project.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Employees Table */}
            <div className="card bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="card__header mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="card__title text-xl font-bold text-green-800">🧑‍💼 Employee Directory</h4>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    value={empSearchQuery}
                    onChange={(e) => setEmpSearchQuery(e.target.value)}
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    className="flex-1 sm:flex-none w-full sm:w-72 p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <button
                    onClick={() => navigate("/hr/create")}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                  >
                    + New Employee
                  </button>
                </div>
              </div>

              <DataTable
                initialData={employeesRows}
                columns={[
                  { key: "id", label: "🆔 ID", sortable: true },
                  { key: "name", label: "👤 Name", sortable: true },
                  { key: "employee_code", label: "🔢 Code" },
                  { key: "phone_number", label: "📞 Phone" },
                ]}
                actionMenus={[
                  {
                    label: "👁️ View",
                    className: "btn btn--ghost text-blue-600 hover:text-blue-800",
                    onClick: (id) => navigate(`/hr/view/${id}`),
                  },
                  {
                    label: "✏️ Edit",
                    className: "btn btn--ghost text-orange-600 hover:text-orange-800",
                    onClick: (id) => navigate(`/hr/edit/${id}`),
                  },
                ]}
                loading={empLoading}
                onSort={handleEmpSort}
              />

              {!empLoading && employeesRows.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                  <button
                    disabled={!empPrevUrl}
                    onClick={goToEmpPreviousPage}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600">
                    Page <strong>{empCurrentPage}</strong> of <strong>{empTotalPages}</strong> (
                    {empTotalItems} total)
                  </span>
                  <button
                    disabled={!empNextUrl}
                    onClick={goToEmpNextPage}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar flex-1 w-full lg:w-1/4 flex flex-col space-y-6">
            {overdueTasksList.length > 0 && (
              <div className="card bg-white p-5 rounded-xl shadow-lg border border-red-100">
                <h4 className="card__title text-lg font-bold text-red-600 mb-4">
                  🚨 Global Overdue Tasks
                </h4>
                <ul className="space-y-3">
                  {overdueTasksList.slice(0, 5).map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start text-sm border-b pb-2 last:border-b-0"
                    >
                      <span className="h-2 w-2 bg-red-500 rounded-full mt-1 mr-3 flex-shrink-0"></span>
                      <div className="flex-grow">
                        <p className="font-medium text-gray-800">{task.name}</p>
                        <p className="text-xs text-gray-500">Project: {task.project_name}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="ml-4 text-indigo-500 hover:text-indigo-700 text-xs font-medium flex-shrink-0"
                      >
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card bg-white p-5 rounded-xl shadow-lg border border-gray-100 space-y-3">
              <h4 className="card__title text-lg font-bold text-gray-800 mb-3">⚙️ Management Tools</h4>
              <div
                className="block text-indigo-600 hover:text-indigo-800 text-sm font-medium py-2 border-b border-gray-100 cursor-pointer"
                onClick={() => navigate("/admin/createproject")}
              >
                📁 Create Project
              </div>
              <div
                className="block text-indigo-600 hover:text-indigo-800 text-sm font-medium py-2 border-b border-gray-100 cursor-pointer"
                onClick={() => navigate("/admin/tasks/1")}
              >
                📝 View Project Tasks (sample)
              </div>
              <div
                className="block text-indigo-600 hover:text-indigo-800 text-sm font-medium py-2 border-b border-gray-100 cursor-pointer"
                onClick={() => navigate("/admin/department")}
              >
                🏢 Department Management
              </div>
              <div
                className="block text-indigo-600 hover:text-indigo-800 text-sm font-medium py-2 border-b border-gray-100 cursor-pointer"
                onClick={() => navigate("/admin/leave/")}
              >
                📅 Employee Leave Requests
              </div>
              <div
                className="block text-indigo-600 hover:text-indigo-800 text-sm font-medium py-2 border-b border-gray-100 cursor-pointer"
                onClick={() => navigate("/admin/schedule/")}
              >
                ⏰ Employee Schedule
              </div>
              <div
                className="block text-indigo-600 hover:text-indigo-800 text-sm font-medium py-2 cursor-pointer"
                onClick={() => navigate("/admin/workinghours/")}
              >
                ⏱️ Working Hours Setup
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== Reusable KPI Card ==========
function KpiCard({ title, value, icon, color }) {
  const colorMap = {
    blue: { bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700" },
    green: { bg: "bg-green-50", border: "border-green-400", text: "text-green-700" },
    red: { bg: "bg-red-50", border: "border-red-400", text: "text-red-700" },
    yellow: { bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-700" },
  };
  const { bg, border, text } = colorMap[color] || colorMap.blue;

  return (
    <div className={`${bg} ${border} ${text} kpi-card`}>
      <div className="card-content">
        <p className="card-title">{title}</p>
        <div className="card-value-container">
          <span className="card-value">{value}</span>
          <span className="card-icon text-3xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}