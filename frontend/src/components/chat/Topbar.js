import React from "react";
import ThemeToggle from "../ThemeToggle"; // keep your original ThemeToggle component

const Topbar = ({ title, streaming, onLogout, initials, userLabel }) => {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
      <div className="flex items-center gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
        {streaming && (
          <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            Generating…
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={onLogout}
          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Sign out"
        >
          Logout
        </button>
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-500 select-none"
          title={userLabel}
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Topbar;