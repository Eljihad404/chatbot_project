import { useEffect, useState } from "react";

function RoleChips({ value = [], onChange }) {
  const all = ["admin", "user"];
  return (
    <div className="flex gap-2 flex-wrap">
      {all.map((r) => (
        <label key={r} className="inline-flex items-center gap-2 px-2 py-1 rounded border cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(r)}
            onChange={(e) => {
              const next = e.target.checked ? [...value, r] : value.filter((x) => x !== r);
              onChange(next);
            }}
          />
          <span className="text-sm">{r}</span>
        </label>
      ))}
    </div>
  );
}

export default function SettingsAgents() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pol, setPol] = useState(null);

  const API = process.env.REACT_APP_RESTAPI_ENDPOINT || "http://localhost:8000";
  const token = localStorage.getItem("token");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/admin/agent-policies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setPol(data || {});               // ensure object
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    try {
      await fetch(`${API}/admin/agent-policies`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(pol),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading agent policies…</p>;
  if (!pol || typeof pol !== "object") return <p>No agent policies found.</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Agents & Roles</h3>

      {Object.entries(pol).map(([key, cfg]) => (
        <div key={key} className="p-4 rounded border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{key.toUpperCase()}</div>
              <div className="text-xs text-gray-500">
                Enable/disable and choose which roles may use this agent.
              </div>
            </div>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!cfg?.enabled}
                onChange={(e) =>
                  setPol((p) => ({ ...p, [key]: { ...(p?.[key] || {}), enabled: e.target.checked } }))
                }
              />
              <span className="text-sm">Enabled</span>
            </label>
          </div>

          <div className="mt-3">
            <label className="block text-sm mb-1">Allowed roles</label>
            <RoleChips
              value={Array.isArray(cfg?.roles) ? cfg.roles : []}
              onChange={(next) => setPol((p) => ({ ...p, [key]: { ...(p?.[key] || {}), roles: next } }))}
            />
          </div>
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Agent Policies"}
      </button>
    </div>
  );
}
