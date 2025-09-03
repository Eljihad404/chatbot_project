// src/components/SettingsModal.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</span>
    {children}
  </label>
);

const Seg = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
    }`}
  >
    {children}
  </button>
);

const SettingsModal = ({ open, onClose, me, onSaveProfile, onChangePassword }) => {
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [username, setUsername] = useState(me?.username || "");
  const [email, setEmail] = useState(me?.email || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (open) {
      setTab("profile");
      setMsg("");
      setUsername(me?.username || "");
      setEmail(me?.email || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open, me]);

  const save = async () => {
    try { setSaving(true); await onSaveProfile?.({ username, email }); setMsg("Profile updated"); }
    catch { setMsg("Failed to update profile"); }
    finally { setSaving(false); }
  };

  const changePass = async () => {
    if (!currentPassword || !newPassword) return setMsg("Please fill all password fields");
    if (newPassword !== confirmPassword) return setMsg("Passwords do not match");
    try { setSaving(true); await onChangePassword?.({ current_password: currentPassword, new_password: newPassword }); setMsg("Password changed"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    catch { setMsg("Failed to change password"); }
    finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
          >
            <div className="w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Seg active={tab === "profile"} onClick={() => setTab("profile")}>Profile</Seg>
                  <Seg active={tab === "security"} onClick={() => setTab("security")}>Security</Seg>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">×</button>
              </div>

              <div className="p-6 grid gap-6">
                {tab === "profile" ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Name">
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Your name"
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="you@example.com"
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Current password">
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </Field>
                    <Field label="New password">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </Field>
                    <Field label="Confirm new password">
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </Field>
                  </div>
                )}

                {msg && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                    {msg}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Close
                </button>
                {tab === "profile" ? (
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                ) : (
                  <button
                    onClick={changePass}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                  >
                    {saving ? "Updating…" : "Change password"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
