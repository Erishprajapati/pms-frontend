import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PROXY_BASE = "/api/proxy";
const API_BASE_URL = "https://api-deployment-6jj9.onrender.com/api";

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [highPriorityTasks, setHighPriorityTasks] = useState([]);
  const [reminders] = useState([
    "Complete Q3 report by Friday",
    "Team sync @ 10 AM tomorrow",
    "Update your profile photo",
  ]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState("");
  const [leaveMessageType, setLeaveMessageType] = useState("");

  const navigate = useNavigate();

  // Decode user ID from JWT
  const decodeUserIdFromToken = () => {
    try {
      const token = localStorage.getItem("token");
      if (token && token.split(".").length === 3) {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        return Number(payload.user_id || payload.id || payload.uid) || null;
      }
    } catch {}
    return null;
  };

  const CURRENT_USER_ID = (() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = Number(localStorage.getItem("user_id")) || null;
      const uid = stored != null ? stored : decodeUserIdFromToken();
      if (uid != null) localStorage.setItem("user_id", String(uid));
      return uid;
    } catch {
      return null;
    }
  })();

  // ========== Auth Helpers ==========
  const refreshAccessToken = async () => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) return null;
    try {
      const res = await fetch(`${PROXY_BASE}/token/refresh/`, {
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

  const fetchAuthenticated = async (url, retry = true) => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentication token missing");

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 && retry) {
        const newToken = await refreshAccessToken();
        if (!newToken) throw new Error("Session expired");
        return fetchAuthenticated(url, false);
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error("Fetch error:", url, err);
      return null;
    }
  };

  // ========== Data Fetching ==========
  const fetchAssignedProjects = async () => {
    setLoadingProjects(true);
    try {
      const projectData = await fetchAuthenticated(`${PROXY_BASE}/projects/projects/`);
      if (!projectData) {
        setLoadingProjects(false);
        return;
      }

      const projects = projectData.results || projectData;
      const uid = CURRENT_USER_ID;

      let uEmail = "";
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          uEmail = (u.email || u.user?.email || u.username || "").toLowerCase();
        }
      } catch {}
      if (!uEmail) {
        try {
          const token = localStorage.getItem("token");
          if (token) {
            const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            uEmail = (payload.email || payload.user_email || payload.username || "").toLowerCase();
          }
        } catch {}
      }

      const normalizeProject = (p) => ({
        ...p,
        id: p.id ?? p.project_id ?? p.pk,
        name: p.name || p.title || p.project_name || `Project #${p.id}`,
        members: p.assigned_members || p.members || [],
        description: p.description || p.summary || "",
      });

      const normalized = projects.map(normalizeProject);
      let filtered = normalized;

      if (uid != null || uEmail) {
        const isUserInProject = (p) => {
          const memberSources = [p.assigned_members, p.members, p.team_members];
          const members = memberSources.find(Array.isArray) || [];
          const ids = members.map((x) => (typeof x === "object" ? x.id || x.user?.id : x));
          const emails = members
            .map((x) => (typeof x === "object" ? x.email || x.user?.email || x.username : null))
            .filter(Boolean)
            .map((s) => String(s).toLowerCase());

          const matchId = uid != null && ids.some((x) => Number(x) === Number(uid));
          const matchEmail = !!uEmail && emails.some((e) => e === uEmail);
          const managerIds = [p.manager, p.project_manager, p.created_by]
            .map((v) => (typeof v === "object" ? v.id || v.user?.id : v))
            .filter((v) => v != null);
          const matchManager = uid != null && managerIds.some((x) => Number(x) === Number(uid));

          return matchId || matchEmail || matchManager;
        };

        filtered = normalized.filter(isUserInProject);
        if (filtered.length === 0) filtered = normalized;
      }

      setAssignedProjects(filtered);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchHighPriorityTasks = async () => {
    const tasks = [];
    for (const project of assignedProjects) {
      try {
        const taskData = await fetchAuthenticated(
          `${PROXY_BASE}/projects/projects/${project.id}/tasks/?priority=high`
        );
        if (taskData) {
          const projectTasks = taskData.results || taskData;
          const highTasks = projectTasks.filter(
            (t) =>
              (t.priority && ["high", "critical"].includes(t.priority.toLowerCase()))
          );
          tasks.push(...highTasks);
        }
      } catch (err) {
        console.warn(`Failed to fetch tasks for project ${project.id}`);
      }
    }
    setHighPriorityTasks(tasks);
  };

  // ========== Leave Form ==========
  const handleLeaveChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitLeaveRequest = async (e) => {
    e.preventDefault();
    const { leaveType, startDate, endDate, reason } = leaveForm;
    if (!leaveType || !startDate || !endDate || !reason) {
      setLeaveMessage("Please fill out all fields.");
      setLeaveMessageType("error");
      return;
    }

    setSubmittingLeave(true);
    setLeaveMessage("");
    setLeaveMessageType("");

    const payloads = [
      { leave_type: leaveType, start_date: startDate, end_date: endDate, reason },
      { leave_type: leaveType, start_date: startDate, end_date: endDate, leave_reason: reason },
      { type: leaveType, start: startDate, end: endDate, reason },
    ];

    try {
      let success = false;
      for (const body of payloads) {
        try {
          const res = await fetch(`${PROXY_BASE}/employees/leave/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(body),
          });

          if (res.status === 401) {
            const newToken = await refreshAccessToken();
            if (!newToken) throw new Error("Session expired");
            continue;
          }

          if (res.ok) {
            success = true;
            break;
          }
        } catch (err) {
          // try next payload
        }
      }

      if (success) {
        setLeaveMessage("Leave request submitted successfully!");
        setLeaveMessageType("success");
        setLeaveForm({ leaveType: "", startDate: "", endDate: "", reason: "" });
      } else {
        throw new Error("Failed to submit leave request.");
      }
    } catch (err) {
      setLeaveMessage(err.message || "Submission failed.");
      setLeaveMessageType("error");
    } finally {
      setSubmittingLeave(false);
    }
  };

  // ========== Navigation ==========
  const tabs = [
    { id: "all", label: "All" },
    { id: "project", label: "Assigned Projects" },
    { id: "reminders", label: "Reminders" },
    { id: "sortingtasks", label: "Sorting Tasks" },
    { id: "department", label: "Department" },
    { id: "schedule", label: "Schedule" },
  ];

  const goToTab = (tabId) => {
    setActiveTab(tabId);
    switch (tabId) {
      case "project":
        navigate("/employees/assignedprojects");
        break;
      case "reminders":
        navigate("/employees/reminders");
        break;
      case "sortingtasks":
        navigate("/employees/sortingtasks");
        break;
      case "department":
        navigate("/employees/department");
        break;
      case "schedule":
        navigate("/employees/schedule");
        break;
      default:
        navigate("/employees");
    }
  };

  // ========== Lifecycle ==========
  useEffect(() => {
    fetchAssignedProjects();
  }, []);

  useEffect(() => {
    if (assignedProjects.length > 0) {
      fetchHighPriorityTasks();
    }
  }, [assignedProjects]);

  // ========== Render ==========
  return (
    <div className="employee-dashboard bg-gray-50 min-h-screen p-4 lg:p-6">
      {/* Top Nav */}
      <nav className="top-nav flex justify-start items-center bg-white p-3 rounded-xl shadow-md mb-6">
        <div className="nav-left flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
              }`}
              onClick={() => goToTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="dashboard-content flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="main-content flex-3 w-full lg:w-3/4 flex flex-col space-y-6">
          <div className="card p-6 rounded-xl">
            <h4 className="card__title text-2xl font-bold text-indigo-800">Welcome!!</h4>
          </div>

          {/* Overview Cards */}
          <div className="overview-cards flex gap-6 flex-wrap">
            <div className="card card--sm bg-white p-5 rounded-xl shadow-md border-t-4 border-indigo-500 flex-1 min-w-[200px]">
              <h4 className="card__title text-sm font-semibold text-gray-500">Total Running Projects</h4>
              <p className="text-3xl font-extrabold text-indigo-600">{assignedProjects.length}</p>
              <p className="text-sm text-gray-500">active projects</p>
            </div>
            <div className="card card--sm bg-white p-5 rounded-xl shadow-md border-t-4 border-red-500 flex-1 min-w-[200px]">
              <h4 className="card__title text-sm font-semibold text-gray-500">High Priority Tasks</h4>
              <p className="text-3xl font-extrabold text-red-600">{highPriorityTasks.length}</p>
              <p className="text-sm text-gray-500">pending action</p>
            </div>
          </div>

          {/* Assigned Projects */}
          <div className="card bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h4 className="card__title text-xl font-bold text-gray-800">Assigned Projects</h4>
            {loadingProjects ? (
              <p className="text-center text-gray-500 italic">Loading assigned projects...</p>
            ) : assignedProjects.length === 0 ? (
              <p className="text-center text-gray-500 italic">You have no assigned projects.</p>
            ) : (
              <div className="project-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {assignedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="card card--sm bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200"
                  >
                    <h4 className="card__title text-lg font-semibold text-gray-700">{project.name}</h4>
                    <p className="text-sm text-gray-500 truncate">
                      {project.description || "No description."}
                    </p>
                    <button
                      onClick={() => navigate(`/employees/assignedprojects/${project.id}`)}
                      className="mt-3 text-indigo-500 hover:text-indigo-700 text-sm font-medium"
                    >
                      View Tasks →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar flex-1 w-full lg:w-1/4 flex flex-col space-y-6">
          {/* Reminders */}
          <div className="card bg-white p-5 rounded-xl shadow-lg border border-gray-100">
            <h4 className="card__title text-lg font-bold text-yellow-600 mb-3">Reminders</h4>
            {reminders.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No reminders set.</p>
            ) : (
              <div className="space-y-2">
                {reminders.map((r, i) => (
                  <div key={i} className="flex items-center text-sm text-gray-700">
                    <span className="h-2 w-2 bg-yellow-400 rounded-full mr-2 flex-shrink-0"></span>
                    <p>{r}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* High Priority Tasks */}
          <div className="card bg-white p-5 rounded-xl shadow-lg border border-gray-100">
            <h4 className="card__title text-lg font-bold text-red-600 mb-3">High Priority Tasks</h4>
            {highPriorityTasks.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No high priority tasks.</p>
            ) : (
              <div className="space-y-2">
                {highPriorityTasks.slice(0, 5).map((task) => (
                  <p
                    key={task.id}
                    className="font-medium hover:text-red-500 cursor-pointer text-sm text-gray-700"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    • {task.name}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Leave Request Form */}
          <div className="card bg-white p-5 rounded-xl shadow-lg border border-gray-100">
            <h4 className="card__title text-lg font-bold text-indigo-600 mb-4">✈ Request Leave</h4>
            <form onSubmit={submitLeaveRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Leave Type</label>
                <select
                  name="leaveType"
                  value={leaveForm.leaveType}
                  onChange={handleLeaveChange}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="" disabled>
                    Select a type
                  </option>
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={leaveForm.startDate}
                  onChange={handleLeaveChange}
                  required
                  className="mt-1 block w-full pl-3 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={leaveForm.endDate}
                  onChange={handleLeaveChange}
                  required
                  className="mt-1 block w-full pl-3 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <textarea
                  name="reason"
                  value={leaveForm.reason}
                  onChange={handleLeaveChange}
                  rows="3"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submittingLeave}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {submittingLeave ? "Submitting..." : "Submit Request"}
              </button>
              {leaveMessage && (
                <p className={`mt-2 text-sm text-center ${leaveMessageType === "success" ? "text-green-600" : "text-red-600"}`}>
                  {leaveMessage}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}