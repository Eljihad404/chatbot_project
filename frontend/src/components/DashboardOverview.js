import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function formatNumber(n) {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}

/**
 * Lightweight dashboard section:
 * - Cards: Users, Active Users (DAU), Docs, Chats, Tokens
 * - Chart: Token usage over time (last N days)
 *
 * Props:
 *  - api: base API URL
 *  - token: JWT string
 *  - days?: number (default 30)
 *  - refreshKey?: any (when changed, data refetches)
 *  - onError?: (msg: string) => void
 */
export default function DashboardOverview({
  api,
  token,
  days = 30,
  refreshKey = 0,
  onError,
}) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    users: 0,
    activeUsers: 0, // DAU
    docs: 0,
    chats: 0,
    tokens: 0,
  });
  const [series, setSeries] = useState([]); // [{ day, tokens, cost }]
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load() {
    try {
      setLoading(true);
      onError?.("");

      const headers = { Authorization: `Bearer ${token}` };

      const [mRes, tsRes] = await Promise.all([
        fetch(`${api}/admin/metrics`, { headers }),
        fetch(`${api}/admin/timeseries/tokens_cost?days=${days}`, { headers }),
      ]);

      if (!mRes.ok || !tsRes.ok) {
        throw new Error("Failed to fetch dashboard overview data");
      }

      const m = await mRes.json();
      const ts = await tsRes.json();

      setMetrics({
        users: m?.Users ?? 0,
        activeUsers: m?.DAU ?? 0, // Daily Active Users (rename if your API exposes something else)
        docs: m?.Docs ?? 0,
        chats: m?.Chats ?? 0,
        tokens: m?.Tokens ?? 0,
      });

      // Expecting [{ day: "YYYY-MM-DD", tokens: number, cost: number }]
      setSeries(Array.isArray(ts) ? ts : []);
      setLastUpdated(new Date());
    } catch (e) {
      onError?.(e.message || "Failed to load dashboard overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, days, api, token]);

  const cards = [
    { key: "users", title: "Users", value: metrics.users },
    { key: "activeUsers", title: "Active Users (DAU)", value: metrics.activeUsers },
    { key: "docs", title: "Docs", value: metrics.docs },
    { key: "chats", title: "Chats", value: metrics.chats },
    { key: "tokens", title: "Tokens", value: metrics.tokens },
  ];

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {(loading ? new Array(5).fill(0) : cards).map((c, idx) => (
          <div
            key={idx}
            className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
          >
            <div className="p-3 bg-indigo-100 dark:bg-indigo-600 rounded-full">
              {loading ? (
                <div className="w-6 h-6 rounded animate-pulse bg-indigo-300/60" />
              ) : (
                <div className="w-6 h-6" />
              )}
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {loading ? (
                  <span className="inline-block w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  formatNumber(c.value)
                )}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {loading ? (
                  <span className="inline-block w-28 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  c.title
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Token Usage Over Time */}
      <section className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
            Token Usage (last {days} days)
          </h2>
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="tokens"
                stroke="#4F46E5"
                strokeWidth={3}
                dot={{ r: 3 }}
                name="Tokens"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {!loading && series.length === 0 && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            No token usage data.
          </p>
        )}
      </section>
    </>
  );
}
