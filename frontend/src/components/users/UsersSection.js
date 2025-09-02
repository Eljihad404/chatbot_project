import React, { useEffect, useMemo, useState } from "react";
import { ToggleRight } from "lucide-react";

export default function UsersSection({ api, token, refreshKey = 0, onError }) {
  const [allUsers, setAllUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  // inline edit
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [roleInput, setRoleInput] = useState("");
  const [savingId, setSavingId] = useState(null);

  async function loadUsers() {
    try {
      setUsersLoading(true);
      onError?.("");
      const qs = userQuery ? `?q=${encodeURIComponent(userQuery.trim())}` : "";
      const res = await fetch(`${api}/admin/users${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      onError?.(e.message || "Failed to load users");
      setAllUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return allUsers.filter((u) => {
      const name = (u.username || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const matchQ = !q || name.includes(q) || email.includes(q);
      const matchRole =
        roleFilter === "all" ||
        (Array.isArray(u.roles) && u.roles.includes(roleFilter));
      const matchActive =
        activeFilter === "all" ||
        (activeFilter === "active" ? !!u.is_active : !u.is_active);
      return matchQ && matchRole && matchActive;
    });
  }, [allUsers, userQuery, roleFilter, activeFilter]);

  async function toggleActive(u) {
    const body = { is_active: !u.is_active };
    const res = await fetch(`${api}/admin/users/${u.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) loadUsers();
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditDraft({
      username: u.username || "",
      email: u.email || "",
      roles: Array.isArray(u.roles) ? [...u.roles] : [],
    });
    setRoleInput("");
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setRoleInput("");
  }
  function handleEditChange(field, value) {
    setEditDraft((d) => ({ ...d, [field]: value }));
  }
  function removeRoleFromDraft(role) {
    setEditDraft((d) => ({ ...d, roles: d.roles.filter((r) => r !== role) }));
  }
  function addRoleToDraft(raw) {
    const r = (raw || "").trim();
    if (!r) return;
    setEditDraft((d) => (d.roles.includes(r) ? d : { ...d, roles: [...d.roles, r] }));
    setRoleInput("");
  }
  function handleRoleKeyDown(e) {
    if (["Enter", ",", "Tab"].includes(e.key)) {
      e.preventDefault();
      addRoleToDraft(roleInput);
    }
  }

  async function saveUserDraft(originalUser) {
    if (!editingId || !editDraft) return;
    const body = {
      username: (editDraft.username || "").trim(),
      email: (editDraft.email || "").trim(),
      roles: Array.isArray(editDraft.roles) ? editDraft.roles : undefined,
    };
    try {
      setSavingId(editingId);
      const res = await fetch(`${api}/admin/users/${originalUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 409) throw new Error(j.detail || "Username/email already in use");
        throw new Error(j.detail || "Failed to save user changes");
      }
      cancelEdit();
      await loadUsers();
    } catch (e) {
      onError?.(e.message || "Failed to save user changes");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-3">
        <div>
          <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Users</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Search by username or email, filter by role and status.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            placeholder="Search by username or email..."
            className="w-64 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            title="Filter by role"
          >
            <option value="all">All roles</option>
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="user">user</option>
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            title="Filter by status"
          >
            <option value="all">All users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={loadUsers}
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-600 dark:text-gray-300">
            <tr>
              <th className="py-2 pr-4">Username</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Roles</th>
              <th className="py-2 pr-4">Active</th>
              <th className="py-2 pr-4">Last Login</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-800 dark:text-gray-100">
            {usersLoading ? (
              <tr>
                <td className="py-4" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="py-4" colSpan={6}>
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700 align-top">
                    <td className="py-2 pr-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDraft?.username || ""}
                          onChange={(e) => handleEditChange("username", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="Username"
                        />
                      ) : (
                        <span className="font-medium">{u.username}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editDraft?.email || ""}
                          onChange={(e) => handleEditChange("email", e.target.value)}
                          className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="email@example.com"
                        />
                      ) : (
                        <span className="text-gray-700 dark:text-gray-200">{u.email}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {editDraft?.roles?.length ? (
                              editDraft.roles.map((role) => (
                                <span
                                  key={role}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-700/40 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700"
                                >
                                  {role}
                                  <button
                                    onClick={() => removeRoleFromDraft(role)}
                                    className="ml-1 text-xs px-1 rounded hover:bg-indigo-200 dark:hover:bg-indigo-600"
                                    title="Remove role"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500">No roles</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={roleInput}
                              onChange={(e) => setRoleInput(e.target.value)}
                              onKeyDown={handleRoleKeyDown}
                              placeholder="Add role (press Enter)"
                              className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button
                              onClick={() => addRoleToDraft(roleInput)}
                              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ) : u.roles && u.roles.length ? (
                        u.roles.map((r) => (
                          <span
                            key={r}
                            className="inline-block px-2 py-1 mr-1 rounded bg-indigo-100 dark:bg-indigo-700/40 text-indigo-700 dark:text-indigo-200"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <ToggleRight /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <ToggleRight /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveUserDraft(u)}
                              disabled={savingId === u.id}
                              className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                            >
                              {savingId === u.id ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(u)}
                              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(u)}
                              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {u.is_active ? "Disable" : "Enable"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
