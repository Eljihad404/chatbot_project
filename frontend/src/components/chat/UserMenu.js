// src/components/UserMenu.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogOut } from "lucide-react";

const UserMenu = ({ initials = "U", userLabel = "User", onSettings, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title={userLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50"
            role="menu"
          >
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 truncate">
              {userLabel}
            </div>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-100"
              onClick={() => { setOpen(false); onSettings?.(); }}
              role="menuitem"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
              onClick={() => { setOpen(false); onLogout?.(); }}
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
