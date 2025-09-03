import React, { useMemo } from "react";
import ChatBubble from "./ChatBubble";

const ChatMessages = ({ messages = [], onEditLast }) => {
  // Find the last user message index (for edit capability)
  const lastUserIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") return i;
    }
    return -1;
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-2">
      {messages.map((m, i) => {
        const text = (m?.content || []).map((c) => c.text).join("");
        const animate = m?.role === "assistant" && !!m?.meta?.animate; // only animate flagged items
        const canEdit = i === lastUserIndex && m?.role === "user";
        return (
          <ChatBubble
            key={i}
            role={m.role}
            text={text}
            animate={animate}
            canEdit={canEdit}
            onEdit={onEditLast}
          />
        );
      })}
    </div>
  );
};

export default ChatMessages;