// src/components/Topbar.jsx
// Avatar opens a user menu (Settings, Logout). No Logout button in the bar.
import React from "react";
import ThemeToggle from "../ThemeToggle";
import UserMenu from "./UserMenu";

const Topbar = ({ title, streaming, initials, userLabel, onOpenSettings, onLogout }) => {
  return (
    <header className="relative z-50 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
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
        <UserMenu
          initials={initials}
          userLabel={userLabel}
          onSettings={onOpenSettings}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
};

export default Topbar;
