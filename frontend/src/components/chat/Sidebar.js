import React from "react";
import logo from "../../assets/logojesa.png"; // keep same asset name; move your file to src/assets

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
  return (
    <aside
      className={`${open ? "w-72" : "w-16"} transition-all duration-300 border-r border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="JESA" className="h-8 w-8 rounded bg-white p-1 shadow" />
          {open && (
            <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">JESA Chat</span>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          title={open ? "Collapse" : "Expand"}
        >
          {open ? "«" : "»"}
        </button>
      </div>

      <div className="px-4">
        <button
          onClick={onNewChat}
          className="w-full mb-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow"
          title="Start a new chat"
        >
          {open ? "New chat" : "+"}
        </button>
      </div>

      <div className="overflow-y-auto px-2 pb-4 h-[calc(100%-120px)]">
        {loading ? (
          <p className="px-2 text-sm text-gray-500">Loading…</p>
        ) : (
          <ul className="space-y-1">
            {chats.map((c) => (
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
        )}
        {error && <p className="px-3 mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </aside>
  );
};

export default Sidebar;