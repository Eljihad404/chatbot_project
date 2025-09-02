import React, { useEffect, useState } from "react";

export default function LogsSection({ api, token, refreshKey = 0, onError }) {
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

  async function loadLogs(p = logPage) {
    try {
      setLogsLoading(true);
      onError?.("");
      const params = new URLSearchParams();
      params.set("limit", String(logPageSize));
      params.set("offset", String((p - 1) * logPageSize));
      if (logQuery.trim()) params.set("q", logQuery.trim());
      if (logLevel !== "all") params.set("level", logLevel);
      if (logUserId.trim()) params.set("user_id", logUserId.trim());
      if (logDateFrom) params.set("date_from", new Date(logDateFrom + "T00:00:00").toISOString());
      if (logDateTo) params.set("date_to", new Date(logDateTo + "T23:59:59").toISOString());

      const res = await fetch(`${api}/admin/logs?` + params.toString(), {
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
      onError?.(e.message || "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(1);
    // eslint-disable-next-line
  }, [refreshKey, logPageSize]);

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

  function toggleSelectLog(id, checked) {
    setSelectedLogIds((prev) => {
      const copy = new Set(prev);
      if (checked) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  async function deleteOneLog(id) {
    if (!id) return;
    const res = await fetch(`${api}/admin/logs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) loadLogs();
  }

  async function bulkDeleteLogs() {
    if (selectedLogIds.size === 0) return;
    const res = await fetch(`${api}/admin/logs/bulk-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: Array.from(selectedLogIds) }),
    });
    if (res.ok) loadLogs();
  }

  function downloadLogsCsv() {
    const params = new URLSearchParams();
    if (logQuery.trim()) params.set("q", logQuery.trim());
    if (logLevel !== "all") params.set("level", logLevel);
    if (logUserId.trim()) params.set("user_id", logUserId.trim());
    if (logDateFrom) params.set("date_from", new Date(logDateFrom + "T00:00:00").toISOString());
    if (logDateTo) params.set("date_to", new Date(logDateTo + "T23:59:59").toISOString());
    const url = `${api}/admin/logs/export?` + params.toString();
    window.open(url, "_blank");
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Recent Activities</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Filter, inspect, export, and delete logs.</p>
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
                <input type="checkbox" onChange={(e) => selectAllOnPage(e.target.checked)} />
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
                  <tr key={l.id} className="border-t border-gray-200 dark:border-gray-700 align-top">
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={selectedLogIds.has(l.id)}
                        onChange={(e) => toggleSelectLog(l.id, e.target.checked)}
                      />
                    </td>
                    <td className="py-2 pr-4">{new Date(l.occurred_at).toLocaleString()}</td>
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
                        onClick={() => setExpandingRow(opened ? null : l.id)}
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
  );
}
