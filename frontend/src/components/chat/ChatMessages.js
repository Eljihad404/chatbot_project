import React from "react";
import ChatBubble from "./ChatBubble";


const ChatMessages = ({ messages = [] }) => (
<div className="flex-1 overflow-y-auto p-6 space-y-2">
{messages.map((m, i) => (
<ChatBubble key={i} role={m.role}>
{(m?.content || []).map((c) => c.text).join("\n")}
</ChatBubble>
))}
</div>
);


export default ChatMessages;