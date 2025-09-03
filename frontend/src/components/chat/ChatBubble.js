import React from "react";
import TypingText from "./TypingText";
import { Copy, PencilLine } from "lucide-react";

const ChatBubble = ({ role, text = "", animate = false, canEdit = false, onEdit }) => {
  const isUser = role === "user";
  const container = isUser ? "justify-end" : "justify-start";
  const bubble = isUser
    ? "bg-indigo-600 text-white"
    : "bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-gray-700/60";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {}
  };

  return (
    <div className={`w-full flex ${container} py-2`}>
      <div className={`relative group max-w-3xl px-4 py-3 rounded-2xl shadow-sm ${bubble}`}>
        {/* Action buttons */}
        <div className={`absolute ${isUser ? "left-2" : "right-2"} -top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button
            onClick={copyToClipboard}
            className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-gray-300/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {canEdit && (
            <button
              onClick={() => onEdit?.(text)}
              className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-gray-300/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Edit last prompt"
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {role === "assistant" && animate ? <TypingText text={text} /> : <span>{text}</span>}
      </div>
    </div>
  );
};

export default ChatBubble;
