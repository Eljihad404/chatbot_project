import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardOverview from "./components/DashboardOverview";
import {
  User,
  MessageSquare,
  FileText,
  Settings as SettingsIcon,
  BarChart2,
  List,
  RefreshCcw,
  ToggleRight,
  File as FileIcon, // alias to avoid confusion with global File
} from "lucide-react";

import ThemeToggle from "./components/ThemeToggle";      // default export
import Docs from "./docs";                               // your file is 'src/docs.js' (lowercase)
import ChatConsole from "./components/ChatConsole";      // default export
import SettingsAgents from "./components/SettingsAgents";// default export
// ---------------------------------------------------------------

const API = process.env.REACT_APP_RESTAPI_ENDPOINT || "http://localhost:8000";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [metrics, setMetrics] = useState({
    Users: 0,
    Chats: 0,
    Tokens: 0,
    Docs: 0,
  });
  const [tokenUsageData, setTokenUsageData] = useState([]);

  // time-series for the dashboard
const [msgSeries, setMsgSeries] = useState([]);
const [userSeries, setUserSeries] = useState([]);
const [latencySeries, setLatencySeries] = useState([]);
const [tokensCostSeries, setTokensCostSeries] = useState([]);
const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  // Users
  const [allUsers, setAllUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Search + Filters
  const [userQuery, setUserQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  // Chat console
  const [selectedUser, setSelectedUser] = useState("");
  const [userChats, setUserChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState("");
  const [chatMsgs, setChatMsgs] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // Logs
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logQuery, setLogQuery] = useState("");
  const [logLevel, setLogLevel] = useState("all");
  const [logUserId, setLogUserId] = useState("");
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(25);
  const [logTotal, setLogTotal] = useState(0);
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());
  const [expandingRow, setExpandingRow] = useState(null);

  const token = localStorage.getItem("token");
  const roles = JSON.parse(localStorage.getItem("roles") || "[]");

  // Guard
  useEffect(() => {
    if (!token) return navigate("/auth", { replace: true });
    if (!roles.includes("admin")) return navigate("/chat", { replace: true });
  }, [token, roles, navigate]);

  // Dashboard data
  async function loadDashboard(isRefresh = false) {
  try {
    setError("");
    isRefresh ? setRefreshing(true) : setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };

    const [mRes, uRes, msgRes, usrRes, latRes, tcRes] = await Promise.all([
      fetch(`${API}/admin/metrics`, { headers }),
      fetch(`${API}/admin/token-usage`, { headers }), // kept for legacy; not shown if tcRes present
      fetch(`${API}/admin/timeseries/messages?days=30`, { headers }),
      fetch(`${API}/admin/timeseries/users?days=30`, { headers }),
      fetch(`${API}/admin/latency?days=30`, { headers }),
      fetch(`${API}/admin/timeseries/tokens_cost?days=30`, { headers }),
    ]);

    if (mRes.status === 401) return navigate("/auth", { replace: true });
    if (mRes.status === 403) return navigate("/chat", { replace: true });
    if (![mRes, uRes, msgRes, usrRes, latRes, tcRes].every(r => r.ok)) {
      throw new Error("Failed to fetch admin data");
    }

    const m = await mRes.json();
    const legacyTokens = await uRes.json();
    const msgs = await msgRes.json();
    const users = await usrRes.json();
    const lat = await latRes.json();
    const tc = await tcRes.json();

    setMetrics({
      Users: m.Users ?? 0,
      Chats: m.Chats ?? 0,
      Tokens: m.Tokens ?? 0,
      Docs: m.Docs ?? 0,
      DAU: m.DAU ?? 0,
      WAU: m.WAU ?? 0,
      MAU: m.MAU ?? 0,
      MessagesToday: m.MessagesToday ?? 0,
      ActiveChatsToday: m.ActiveChatsToday ?? 0,
      CostToday: m.CostToday ?? 0,
      p50_ms: m.p50_ms ?? null,
      p95_ms: m.p95_ms ?? null,
    });

    setTokenUsageData(Array.isArray(legacyTokens) ? legacyTokens : []);
    setMsgSeries(Array.isArray(msgs) ? msgs : []);
    setUserSeries(Array.isArray(users) ? users : []);
    setLatencySeries(Array.isArray(lat) ? lat : []);
    setTokensCostSeries(Array.isArray(tc) ? tc : []);

    setLastUpdated(new Date());
  } catch (e) {
    setError(e.message || "Failed to load admin data");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}


  // Users
  async function loadUsers() {
    try {
      setUsersLoading(true);
      const qs = userQuery ? `?q=${encodeURIComponent(userQuery.trim())}` : "";
      const res = await fetch(`${API}/admin/users${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load users");
      setAllUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(userQuery.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(id);
  }, [userQuery]);

  // Apply filters
  useEffect(() => {
    const filtered = allUsers.filter((u) => {
      const q = debouncedQuery;
      const name = (u.username || "").toLowerCase();
      const email = (u.email || "").toLowerCase();

      const matchQ = !q || name.includes(q) || email.includes(q);
      const matchRole =
        roleFilter === "all" ||
        (Array.isArray(u.roles) && u.roles.includes(roleFilter));
      const matchActive =
        activeFilter === "all" ||
        (activeFilter === "active" ? !!u.is_active : !u.is_active);

      return matchQ && matchRole && matchActive;
    });

    setUsers(filtered);
  }, [allUsers, debouncedQuery, roleFilter, activeFilter]);

  async function toggleActive(u) {
    const body = { is_active: !u.is_active };
    const res = await fetch(`${API}/admin/users/${u.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) loadUsers();
  }

  // Inline edit (username/email/roles)
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [roleInput, setRoleInput] = useState("");
  const [savingId, setSavingId] = useState(null);

  function startEdit(u) {
    setEditingId(u.id);
    setEditDraft({
      username: u.username || "",
      email: u.email || "",
      roles: Array.isArray(u.roles) ? [...u.roles] : [],
    });
    setRoleInput("");
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setRoleInput("");
  }
  function handleEditChange(field, value) {
    setEditDraft((d) => ({ ...d, [field]: value }));
  }
  function removeRoleFromDraft(role) {
    setEditDraft((d) => ({ ...d, roles: d.roles.filter((r) => r !== role) }));
  }
  function addRoleToDraft(raw) {
    const r = (raw || "").trim();
    if (!r) return;
    setEditDraft((d) => {
      if (d.roles.includes(r)) return d;
      return { ...d, roles: [...d.roles, r] };
    });
    setRoleInput("");
  }
  function handleRoleKeyDown(e) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      addRoleToDraft(roleInput);
    }
  }
  async function saveUserDraft(originalUser) {
    if (!editingId || !editDraft) return;
    const body = {
      username: (editDraft.username || "").trim(),
      email: (editDraft.email || "").trim(),
      roles: Array.isArray(editDraft.roles) ? editDraft.roles : undefined,
    };
    try {
      setSavingId(editingId);
      const res = await fetch(`${API}/admin/users/${originalUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 409)
          throw new Error(j.detail || "Username/email already in use");
        throw new Error(j.detail || "Failed to save user changes");
      }
      cancelEdit();
      await loadUsers();
    } catch (e) {
      setError(e.message || "Failed to save user changes");
    } finally {
      setSavingId(null);
    }
  }

  // Chat console (admin -> user chats)
  async function loadChatsForUser(uid) {
    setSelectedUser(uid);
    setSelectedChat("");
    setChatMsgs([]);
    if (!uid) {
      setUserChats([]);
      return;
    }
    const res = await fetch(`${API}/admin/users/${uid}/chats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setUserChats(await res.json());
  }
  async function loadMessages(chatId) {
    setSelectedChat(chatId);
    const res = await fetch(`${API}/admin/chats/${chatId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setChatMsgs(await res.json());
  }
  async function sendReply() {
    const t = replyText.trim();
    if (!t || !selectedChat) return;
    setSending(true);
    const res = await fetch(`${API}/admin/chats/${selectedChat}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: t }),
    });
    setSending(false);
    if (res.ok) {
      setReplyText("");
      loadMessages(selectedChat);
    }
  }

  // Logs
  async function loadLogs(p = logPage) {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams();
      params.set("limit", String(logPageSize));
      params.set("offset", String((p - 1) * logPageSize));
      if (logQuery.trim()) params.set("q", logQuery.trim());
      if (logLevel !== "all") params.set("level", logLevel);
      if (logUserId.trim()) params.set("user_id", logUserId.trim());
      if (logDateFrom)
        params.set(
          "date_from",
          new Date(logDateFrom + "T00:00:00").toISOString()
        );
      if (logDateTo)
        params.set(
          "date_to",
          new Date(logDateTo + "T23:59:59").toISOString()
        );

      const res = await fetch(`${API}/admin/logs?` + params.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await res.json();

      if (Array.isArray(data)) {
        setLogs(data);
        setLogTotal(data.length);
      } else {
        setLogs(Array.isArray(data.items) ? data.items : []);
        setLogTotal(data.total || 0);
      }
      setLogPage(p);
      setSelectedLogIds(new Set());
    } catch (e) {
      setError(e.message || "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }

  async function deleteOneLog(id) {
    if (!id) return;
    const res = await fetch(`${API}/admin/logs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) loadLogs();
  }
  async function bulkDeleteLogs() {
    if (selectedLogIds.size === 0) return;
    const res = await fetch(`${API}/admin/logs/bulk-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: Array.from(selectedLogIds) }),
    });
    if (res.ok) loadLogs();
  }
  function toggleSelectLog(id, checked) {
    setSelectedLogIds((prev) => {
      const copy = new Set(prev);
      if (checked) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }
  function selectAllOnPage(checked) {
    setSelectedLogIds((prev) => {
      const copy = new Set(prev);
      logs.forEach((l) => {
        if (checked) copy.add(l.id);
        else copy.delete(l.id);
      });
      return copy;
    });
  }
  function downloadLogsCsv() {
    const params = new URLSearchParams();
    if (logQuery.trim()) params.set("q", logQuery.trim());
    if (logLevel !== "all") params.set("level", logLevel);
    if (logUserId.trim()) params.set("user_id", logUserId.trim());
    if (logDateFrom)
      params.set("date_from", new Date(logDateFrom + "T00:00:00").toISOString());
    if (logDateTo)
      params.set("date_to", new Date(logDateTo + "T23:59:59").toISOString());
    const url = `${API}/admin/logs/export?` + params.toString();
    window.open(url, "_blank");
  }

  // Settings
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSavedAt, setSettingsSavedAt] = useState(null);

  async function loadSettings() {
    try {
      setSettingsLoading(true);
      const res = await fetch(`${API}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load settings");
      setSettings(await res.json());
    } catch (e) {
      setError(e.message || "Failed to load settings");
    } finally {
      setSettingsLoading(false);
    }
  }
  async function saveSettings() {
    try {
      setSettingsSaving(true);
      const res = await fetch(`${API}/admin/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to save settings");
      }
      setSettings(await res.json());
      setSettingsSavedAt(new Date());
    } catch (e) {
      setError(e.message || "Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  }

  // initial + interval
  useEffect(() => {
    loadDashboard(false);
    const id = setInterval(() => loadDashboard(true), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activePage === "Users") loadUsers();
    if (activePage === "Chat Console") {
      loadUsers();
      setUserChats([]);
      setChatMsgs([]);
    }
    if (activePage === "Logs") loadLogs(1);
    if (activePage === "Settings") loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  const navItems = [
    { label: "Dashboard", icon: <BarChart2 className="w-5 h-5" /> },
    { label: "Users", icon: <User className="w-5 h-5" /> },
    { label: "Chat Console", icon: <MessageSquare className="w-5 h-5" /> },
    { label: "Docs", icon: <FileIcon className="w-5 h-5" /> },
    { label: "Logs", icon: <FileText className="w-5 h-5" /> },
    { label: "Settings", icon: <SettingsIcon className="w-5 h-5" /> },
    { label: "Agents", icon: <ToggleRight className="w-5 h-5" /> },
  ];

  const metricCardsPrimary = [
  { key: "Users", title: "Users", value: metrics.Users, icon: <User className="w-6 h-6" /> },
  { key: "Chats", title: "Chats", value: metrics.Chats, icon: <MessageSquare className="w-6 h-6" /> },
  { key: "Tokens", title: "Tokens", value: metrics.Tokens, icon: <BarChart2 className="w-6 h-6" /> },
  { key: "Docs", title: "Docs", value: metrics.Docs, icon: <FileText className="w-6 h-6" /> },
];
const metricCardsSecondary = [
  { key: "DAU", title: "DAU", value: metrics.DAU ?? "—" },
  { key: "WAU", title: "WAU", value: metrics.WAU ?? "—" },
  { key: "MAU", title: "MAU", value: metrics.MAU ?? "—" },
  { key: "MessagesToday", title: "Messages (today)", value: metrics.MessagesToday ?? "—" },
  { key: "ActiveChatsToday", title: "Active Chats (today)", value: metrics.ActiveChatsToday ?? "—" },
  { key: "CostToday", title: "Cost (today)", value: (metrics.CostToday ?? 0).toFixed(2) },
  { key: "p50_ms", title: "Latency p50 (ms)", value: metrics.p50_ms ?? "—" },
  { key: "p95_ms", title: "Latency p95 (ms)", value: metrics.p95_ms ?? "—" },
];


  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300`}
      >
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && (
            <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Admin</h2>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="focus:outline-none ml-auto">
            <List />
          </button>
        </div>
        <nav className="mt-2">
          {navItems.map((item) => (
            <div
              key={item.label}
              onClick={() => setActivePage(item.label)}
              className={`flex items-center px-4 py-2 cursor-pointer space-x-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                activePage === item.label ? "bg-gray-100 dark:bg-gray-700" : ""
              }`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow">
          <div className="flex items-center space-x-3">
            <ThemeToggle />
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() =>
                activePage === "Dashboard"
                  ? setDashboardRefreshKey((k) => k + 1)
                  : activePage === "Users"
                  ? loadUsers()
                  : activePage === "Logs"
                  ? loadLogs(1)
                  : null
              }
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Refresh"
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="bg-indigo-500 text-white px-3 py-1 rounded-full">Admin</div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Dashboard */}
          {activePage === "Dashboard" && (
          <DashboardOverview 
          api={API} 
          token={token} 
          refreshKey={dashboardRefreshKey} 
          onError={setError} 
          /> 
         )}


          {/* Users */}
          {activePage === "Users" && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-3">
                <div>
                  <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Users</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Search by username or email, filter by role and status.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Search by username or email..."
                      className="w-64 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    title="Filter by role"
                  >
                    <option value="all">All roles</option>
                    <option value="admin">admin</option>
                    <option value="manager">manager</option>
                    <option value="user">user</option>
                  </select>

                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    title="Filter by status"
                  >
                    <option value="all">All users</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <button
                    onClick={loadUsers}
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2 pr-4">Username</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Roles</th>
                      <th className="py-2 pr-4">Active</th>
                      <th className="py-2 pr-4">Last Login</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="text-gray-800 dark:text-gray-100">
                    {usersLoading ? (
                      <tr>
                        <td className="py-4" colSpan={6}>
                          Loading…
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td className="py-4" colSpan={6}>
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isEditing = editingId === u.id;
                        return (
                          <tr
                            key={u.id}
                            className="border-t border-gray-200 dark:border-gray-700 align-top"
                          >
                            {/* Username */}
                            <td className="py-2 pr-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editDraft?.username || ""}
                                  onChange={(e) =>
                                    handleEditChange("username", e.target.value)
                                  }
                                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  placeholder="Username"
                                />
                              ) : (
                                <span className="font-medium">{u.username}</span>
                              )}
                            </td>

                            {/* Email */}
                            <td className="py-2 pr-4">
                              {isEditing ? (
                                <input
                                  type="email"
                                  value={editDraft?.email || ""}
                                  onChange={(e) =>
                                    handleEditChange("email", e.target.value)
                                  }
                                  className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  placeholder="email@example.com"
                                />
                              ) : (
                                <span className="text-gray-700 dark:text-gray-200">
                                  {u.email}
                                </span>
                              )}
                            </td>

                            {/* Roles */}
                            <td className="py-2 pr-4">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    {editDraft?.roles?.length ? (
                                      editDraft.roles.map((role) => (
                                        <span
                                          key={role}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-700/40 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700"
                                        >
                                          {role}
                                          <button
                                            onClick={() =>
                                              removeRoleFromDraft(role)
                                            }
                                            className="ml-1 text-xs px-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600"
                                            title="Remove role"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-gray-500">
                                        No roles
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={roleInput}
                                      onChange={(e) =>
                                        setRoleInput(e.target.value)
                                      }
                                      onKeyDown={handleRoleKeyDown}
                                      placeholder="Add role (press Enter)"
                                      className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                    <button
                                      onClick={() => addRoleToDraft(roleInput)}
                                      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      Add
                                    </button>
                                  </div>
                                </div>
                              ) : u.roles && u.roles.length ? (
                                u.roles.map((r) => (
                                  <span
                                    key={r}
                                    className="inline-block px-2 py-1 mr-1 rounded bg-indigo-100 dark:bg-indigo-700/40 text-indigo-700 dark:text-indigo-200"
                                  >
                                    {r}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>

                            {/* Active */}
                            <td className="py-2 pr-4">
                              {u.is_active ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <ToggleRight /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-500">
                                  <ToggleRight /> Inactive
                                </span>
                              )}
                            </td>

                            {/* Last login */}
                            <td className="py-2 pr-4">
                              {u.last_login
                                ? new Date(u.last_login).toLocaleString()
                                : "—"}
                            </td>

                            {/* Actions */}
                            <td className="py-2 pr-4">
                              <div className="flex flex-wrap items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => saveUserDraft(u)}
                                      disabled={savingId === u.id}
                                      className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                      {savingId === u.id ? "Saving…" : "Save"}
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEdit(u)}
                                      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => toggleActive(u)}
                                      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      {u.is_active ? "Disable" : "Enable"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Chat Console */}
          {activePage === "Chat Console" && (
            <ChatConsole api={API} token={token} />
          )}

          {/* Docs */}
          {activePage === "Docs" && <Docs />}

          {/* Logs */}
          {activePage === "Logs" && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    Recent Activities
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Filter, inspect, export, and delete logs.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadLogs(1)}
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={downloadLogsCsv}
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={bulkDeleteLogs}
                    disabled={selectedLogIds.size === 0}
                    className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
                <input
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  placeholder="Search activity or metadata…"
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 md:col-span-2"
                />
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value)}
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                >
                  <option value="all">All levels</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
                <input
                  value={logUserId}
                  onChange={(e) => setLogUserId(e.target.value)}
                  placeholder="User ID (optional)"
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
                <input
                  type="date"
                  value={logDateFrom}
                  onChange={(e) => setLogDateFrom(e.target.value)}
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
                <input
                  type="date"
                  value={logDateTo}
                  onChange={(e) => setLogDateTo(e.target.value)}
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => loadLogs(1)}
                  className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setLogQuery("");
                    setLogLevel("all");
                    setLogUserId("");
                    setLogDateFrom("");
                    setLogDateTo("");
                    loadLogs(1);
                  }}
                  className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Reset
                </button>
                <select
                  value={logPageSize}
                  onChange={(e) => {
                    setLogPageSize(parseInt(e.target.value, 10));
                    loadLogs(1);
                  }}
                  className="ml-auto px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/page
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="py-2 pr-4">
                        <input
                          type="checkbox"
                          onChange={(e) => selectAllOnPage(e.target.checked)}
                        />
                      </th>
                      <th className="py-2 pr-4">When</th>
                      <th className="py-2 pr-4">Level</th>
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Activity</th>
                      <th className="py-2 pr-4">Metadata</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-800 dark:text-gray-100">
                    {logsLoading ? (
                      <tr>
                        <td className="py-4" colSpan={7}>
                          Loading…
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td className="py-4" colSpan={7}>
                          No activities
                        </td>
                      </tr>
                    ) : (
                      logs.map((l) => {
                        const opened = expandingRow === l.id;
                        return (
                          <tr
                            key={l.id}
                            className="border-t border-gray-200 dark:border-gray-700 align-top"
                          >
                            <td className="py-2 pr-4">
                              <input
                                type="checkbox"
                                checked={selectedLogIds.has(l.id)}
                                onChange={(e) =>
                                  toggleSelectLog(l.id, e.target.checked)
                                }
                              />
                            </td>
                            <td className="py-2 pr-4">
                              {new Date(l.occurred_at).toLocaleString()}
                            </td>
                            <td className="py-2 pr-4">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  l.level === "ERROR"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    : l.level === "WARN"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                                }`}
                              >
                                {l.level || "—"}
                              </span>
                            </td>
                            <td className="py-2 pr-4">{l.user_id || "—"}</td>
                            <td className="py-2 pr-4">{l.activity}</td>
                            <td className="py-2 pr-4">
                              <button
                                onClick={() =>
                                  setExpandingRow(opened ? null : l.id)
                                }
                                className="text-indigo-600 dark:text-indigo-300 underline"
                              >
                                {opened ? "Hide" : "View"}
                              </button>
                              {opened && (
                                <pre className="mt-2 max-w-xl overflow-x-auto whitespace-pre-wrap text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                                  {JSON.stringify(l.metadata || {}, null, 2)}
                                </pre>
                              )}
                            </td>
                            <td className="py-2 pr-4">
                              <button
                                onClick={() => deleteOneLog(l.id)}
                                className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Page {logPage} / {Math.max(1, Math.ceil(logTotal / logPageSize))} • {logTotal} results
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                    onClick={() => loadLogs(Math.max(1, logPage - 1))}
                    disabled={logPage <= 1}
                  >
                    Prev
                  </button>
                  <button
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                    onClick={() => loadLogs(logPage + 1)}
                    disabled={logPage >= Math.ceil(logTotal / logPageSize)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Settings */}
          {activePage === "Settings" && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 max-w-3xl">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Settings</h2>

              {settingsLoading && <p>Loading…</p>}
              {settings && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                        Access Token TTL (minutes)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={1440}
                        value={settings.access_token_ttl_min}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            access_token_ttl_min: parseInt(e.target.value || "0", 10),
                          }))
                        }
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                        Reset Code TTL (minutes)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={settings.reset_code_ttl_min}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            reset_code_ttl_min: parseInt(e.target.value || "0", 10),
                          }))
                        }
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                        Reset Max Attempts
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={settings.reset_max_attempts}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            reset_max_attempts: parseInt(e.target.value || "0", 10),
                          }))
                        }
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                    </div>
                  </div>

                  <hr className="border-gray-200 dark:border-gray-700" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">SMTP From</label>
                      <input
                        value={settings.smtp_from}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, smtp_from: e.target.value }))
                        }
                        placeholder="JESA Bot <your@email>"
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">SMTP Host</label>
                      <input
                        value={settings.smtp_host}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, smtp_host: e.target.value }))
                        }
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">SMTP Port</label>
                      <input
                        type="number"
                        min={1}
                        max={65535}
                        value={settings.smtp_port}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            smtp_port: parseInt(e.target.value || "0", 10),
                          }))
                        }
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">SMTP User</label>
                      <input
                        value={settings.smtp_user}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, smtp_user: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveSettings}
                      disabled={settingsSaving}
                      className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {settingsSaving ? "Saving…" : "Save Settings"}
                    </button>
                    {settingsSavedAt && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Saved {settingsSavedAt.toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Note: secrets like SMTP password should stay in your environment as an app password (not editable here).
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Agents */}
          {activePage === "Agents" && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 max-w-3xl">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
                Agents & Roles
              </h2>
              <SettingsAgents />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
