import React from "react";
import TypingText from "./TypingText";


const ChatBubble = ({ role, children }) => {
const isUser = role === "user";
const container = isUser ? "justify-end" : "justify-start";
const bubble = isUser
? "bg-indigo-600 text-white"
: "bg-white/80 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-gray-700/60";


return (
<div className={`w-full flex ${container} py-2`}>
<div className={`max-w-3xl px-4 py-3 rounded-2xl shadow-sm ${bubble}`}>
{role === "assistant" ? <TypingText text={children} /> : children}
</div>
</div>
);
};


export default ChatBubble;