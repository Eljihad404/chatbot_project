 import React, { useEffect, useState } from "react";
 import { useNavigate } from "react-router-dom";
 import AdminSidebar from "../components/layout/AdminSidebar";
 import AdminTopbar from "../components/layout/AdminTopbar";
 import DashboardOverview from "../components/dashboard/DashboardOverview";
 import UsersSection from "../components/users/UsersSection";
import LogsSection from "../components/logs/LogsSection";
 import SettingsSection from "../components/settings/SettingsSection";
 import AgentsSection from "../components/agents/AgentsSection";
 import Docs from "../docs";
 import ChatConsole from "../components/ChatConsole";
 const API = process.env.REACT_APP_RESTAPI_ENDPOINT || "http://localhost:8000";
 export default function AdminDashboard() {
 const navigate = useNavigate();
 const token = localStorage.getItem("token");
 const roles = JSON.parse(localStorage.getItem("roles") || "[]");
 const [sidebarOpen, setSidebarOpen] = useState(true);
 const [activePage, setActivePage] = useState("Dashboard");
 const [error, setError] = useState("");
 // per-page refresh keys (bump to trigger child reloads)
 const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
 const [usersRefreshKey, setUsersRefreshKey] = useState(0);
 const [logsRefreshKey, setLogsRefreshKey] = useState(0);
 const [settingsRefreshKey, setSettingsRefreshKey] = useState(0);
 // Guard
 useEffect(() => {
 if (!token) return navigate("/auth", { replace: true });
 if (!roles.includes("admin")) return navigate("/chat", { replace: true });
 }, [token, roles, navigate]);
 function handleRefresh() {
 if (activePage === "Dashboard") setDashboardRefreshKey((k) => k + 1);
 else if (activePage === "Users") setUsersRefreshKey((k) => k + 1);
 else if (activePage === "Logs") setLogsRefreshKey((k) => k + 1);
 else if (activePage === "Settings") setSettingsRefreshKey((k) => k + 1);
 }
 return (
 <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
 <AdminSidebar
 open={sidebarOpen}
 onToggle={() => setSidebarOpen((s) => !s)}
 activePage={activePage}
 onSelect={setActivePage}
 />
 <div className="flex-1 flex flex-col">
 <AdminTopbar onRefresh={handleRefresh} />
 <main className="p-6 overflow-y-auto">
 {error && (
 <div className="mb-4 p-3 rounded bg-red-100 text-red-700 dark:bg
red-900/30 dark:text-red-300">
 {error}
 </div>
 )}
 {activePage === "Dashboard" && (
 <DashboardOverview api={API} token={token}
 refreshKey={dashboardRefreshKey} onError={setError} />
 )}
 {activePage === "Users" && (
 <UsersSection api={API} token={token} refreshKey={usersRefreshKey}
 onError={setError} />
 )}
 {activePage === "Chat Console" && <ChatConsole api={API}
 token={token} />}
 {activePage === "Docs" && <Docs />}
 {activePage === "Logs" && (
 <LogsSection api={API} token={token} refreshKey={logsRefreshKey}
 onError={setError} />
 )}
 {activePage === "Settings" && (
 <SettingsSection api={API} token={token}
 refreshKey={settingsRefreshKey} onError={setError} />
 )}
 {activePage === "Agents" && <AgentsSection />}
 </main>
 </div>
 </div>
 );
 }