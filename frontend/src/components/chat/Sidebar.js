import React, { useMemo, useState } from "react";
import logo from "../../assets/logojesa.png"; // keep same asset name; move your file to src/assets
import { Search, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";

const Sidebar = ({
  open,
  setOpen,
  chats = [],
  currentId,
  loading,
  error,
  onNewChat,
  onSelectChat,
  onRenameChat,
}) => {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q) return chats;
    const s = q.toLowerCase();
    return chats.filter((c) => (c.title || "Untitled").toLowerCase().includes(s));
  }, [q, chats]);

  return (
    <aside
      className={`${open ? "w-72" : "w-16"} transition-all duration-300 border-r border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg`}
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <img src={logo} alt="JESA" className="h-8 w-8 rounded bg-white p-1 shadow" />
          {open && (
            <span className="truncate text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              JESA Chat
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          title={open ? "Collapse" : "Expand"}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          {open ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Search */}
      {open && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chats…"
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
                title="Clear"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* New chat */}
      <div className="px-3">
        <button
          onClick={onNewChat}
          className="w-full mb-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow inline-flex items-center justify-center gap-2"
          title="Start a new chat"
        >
          {open ? (
            <>
              <Plus className="h-4 w-4" />
              <span>New chat</span>
            </>
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Chats list */}
      <div className="overflow-y-auto px-2 pb-4 h-[calc(100%-160px)]">
        {loading ? (
          <p className="px-2 text-sm text-gray-500">Loading…</p>
        ) : filtered.length > 0 ? (
          <ul className="space-y-1">
            {filtered.map((c) => (
              <li
                key={c.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  currentId === c.id ? "bg-gray-100 dark:bg-gray-800" : ""
                }`}
                onClick={() => onSelectChat?.(c.id)}
                onDoubleClick={() => {
                  if (!open) return;
                  const t = prompt("Rename chat", c.title || "");
                  if (t && t.trim()) onRenameChat?.(c.id, t.trim());
                }}
                title={c.title}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                {open ? (
                  <span className="truncate text-sm text-gray-800 dark:text-gray-200">
                    {c.title || "Untitled"}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500" title={c.title || "Untitled"}>
                    •
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 text-sm text-gray-500">No chats found</p>
        )}
        {error && <p className="px-3 mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </aside>
  );
};

export default Sidebar;
