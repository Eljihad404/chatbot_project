import React from "react";
import {
  BarChart2,
  User,
  MessageSquare,
  File as FileIcon,
  FileText,
  Settings as SettingsIcon,
  ToggleRight,
  List,
} from "lucide-react";

export default function AdminSidebar({ open, onToggle, activePage, onSelect }) {
  const navItems = [
    { label: "Dashboard", icon: <BarChart2 className="w-5 h-5" /> },
    { label: "Users", icon: <User className="w-5 h-5" /> },
    { label: "Chat Console", icon: <MessageSquare className="w-5 h-5" /> },
    { label: "Docs", icon: <FileIcon className="w-5 h-5" /> },
    { label: "Logs", icon: <FileText className="w-5 h-5" /> },
    { label: "Settings", icon: <SettingsIcon className="w-5 h-5" /> },
    { label: "Agents", icon: <ToggleRight className="w-5 h-5" /> },
  ];

  return (
    <aside
      className={`${
        open ? "w-64" : "w-20"
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300`}
    >
      <div className="p-4 flex items-center justify-between">
        {open && (
          <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            Admin
          </h2>
        )}
        <button onClick={onToggle} className="focus:outline-none ml-auto">
          <List />
        </button>
      </div>

      <nav className="mt-2">
        {navItems.map((item) => (
          <div
            key={item.label}
            onClick={() => onSelect(item.label)}
            className={`flex items-center px-4 py-2 cursor-pointer space-x-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              activePage === item.label ? "bg-gray-100 dark:bg-gray-700" : ""
            }`}
          >
            {item.icon}
            {open && <span>{item.label}</span>}
          </div>
        ))}
      </nav>
    </aside>
  );
}
