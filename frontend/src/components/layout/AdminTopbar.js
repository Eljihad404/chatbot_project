import React from "react";
import { RefreshCcw } from "lucide-react";
import ThemeToggle from "../ThemeToggle";

export default function AdminTopbar({ onRefresh }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow">
      <div className="flex items-center space-x-3">
        <ThemeToggle />
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Refresh"
        >
          <RefreshCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <div className="bg-indigo-500 text-white px-3 py-1 rounded-full">Admin</div>
      </div>
    </header>
  );
}
