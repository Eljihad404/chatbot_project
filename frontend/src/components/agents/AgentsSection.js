import React from "react";
import SettingsAgents from "../SettingsAgents";

export default function AgentsSection() {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 max-w-3xl">
      <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
        Agents & Roles
      </h2>
      <SettingsAgents />
    </section>
  );
}
