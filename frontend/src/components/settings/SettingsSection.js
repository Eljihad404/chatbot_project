import React, { useEffect, useState } from "react";

export default function SettingsSection({ api, token, refreshKey = 0, onError }) {
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSavedAt, setSettingsSavedAt] = useState(null);

  async function loadSettings() {
    try {
      setSettingsLoading(true);
      onError?.("");
      const res = await fetch(`${api}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load settings");
      setSettings(await res.json());
    } catch (e) {
      onError?.(e.message || "Failed to load settings");
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSettingsSaving(true);
      const res = await fetch(`${api}/admin/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to save settings");
      }
      setSettings(await res.json());
      setSettingsSavedAt(new Date());
    } catch (e) {
      onError?.(e.message || "Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line
  }, [refreshKey]);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 max-w-3xl">
      <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Settings</h2>

      {settingsLoading && <p>Loading…</p>}

      {settings && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Access Token TTL (minutes)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={settings.access_token_ttl_min}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    access_token_ttl_min: parseInt(e.target.value || "0", 10),
                  }))
                }
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Reset Code TTL (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.reset_code_ttl_min}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    reset_code_ttl_min: parseInt(e.target.value || "0", 10),
                  }))
                }
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Reset Max Attempts
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.reset_max_attempts}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    reset_max_attempts: parseInt(e.target.value || "0", 10),
                  }))
                }
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">SMTP From</label>
              <input
                value={settings.smtp_from}
                onChange={(e) => setSettings((s) => ({ ...s, smtp_from: e.target.value }))}
                placeholder="JESA Bot <your@email>"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">SMTP Host</label>
              <input
                value={settings.smtp_host}
                onChange={(e) => setSettings((s) => ({ ...s, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">SMTP Port</label>
              <input
                type="number"
                min={1}
                max={65535}
                value={settings.smtp_port}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    smtp_port: parseInt(e.target.value || "0", 10),
                  }))
                }
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">SMTP User</label>
              <input
                value={settings.smtp_user}
                onChange={(e) => setSettings((s) => ({ ...s, smtp_user: e.target.value }))}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveSettings}
              disabled={settingsSaving}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {settingsSaving ? "Saving…" : "Save Settings"}
            </button>
            {settingsSavedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Saved {settingsSavedAt.toLocaleTimeString()}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Note: secrets like SMTP password should stay in your environment as an app password (not editable here).
          </p>
        </div>
      )}
    </section>
  );
}
