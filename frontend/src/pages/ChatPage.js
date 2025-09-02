import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/chat/Sidebar";
import Topbar from "../components/chat/Topbar";
import ChatMessages from "../components/chat/ChatMessages";
import ChatInput from "../components/chat/ChatInput";
import { getInitials } from "../utils/chat/getInitials";

export default function ChatPage() {
  const navigate = useNavigate();

  // --- UI State ---
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Data State ---
  const [me, setMe] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  // --- Refs ---
  const inputRef = useRef();
  const scrollRef = useRef();
  const didInit = useRef(false);

  // --- Auth/API ---
  const token = localStorage.getItem("token");
  const API = process.env.REACT_APP_RESTAPI_ENDPOINT || "http://localhost:8000";

  // Init: fetch me + chats (logic preserved)
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      try {
        const meRes = await fetch(`${API}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (meRes.ok) setMe(await meRes.json());
      } catch (_) {}
      fetchChats();
    })();
  }, [API, token]);

  // Auto-scroll on new messages (logic preserved)
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // --- Auth actions ---
  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("roles");
    } finally {
      setChats([]);
      setMessages([]);
      setCurrentId(null);
      navigate("/auth", { replace: true });
    }
  };

  // --- API calls (logic preserved) ---
  async function fetchChats() {
    setLoadingChats(true);
    try {
      const res = await fetch(`${API}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setChats(data);
      if (!currentId && data.length) {
        loadChat(data[0].id);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load chats");
    } finally {
      setLoadingChats(false);
    }
  }

  async function loadChat(id) {
    setCurrentId(id);
    setMessages([]);
    try {
      const res = await fetch(`${API}/chat/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setMessages(await res.json());
    } catch (e) {
      console.error(e);
      setError("Failed to load conversation");
    }
  }

  async function createChat(initialTitle = "New chat") {
    try {
      const res = await fetch(`${API}/chat/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: initialTitle }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setChats((prev) => [{ id: data.id, title: data.title }, ...prev]);
      setCurrentId(data.id);
      setMessages([]);
      return data.id;
    } catch (e) {
      console.error(e);
      setError("Failed to create chat");
      return null;
    }
  }

  async function renameChat(id, title) {
    try {
      const res = await fetch(`${API}/chat/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chat_id: id, title }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    } catch (e) {
      console.error(e);
    }
  }

  async function sendMessage(text) {
    setError("");
    setStreaming(true);

    let id = currentId;
    const isCreating = !id;

    // Create chat if none selected
    if (!id) {
      id = await createChat(text.slice(0, 48));
      if (!id) {
        setStreaming(false);
        return;
      }
    } else {
      // Auto-rename if still default
      const thisChat = chats.find((c) => c.id === id);
      if (thisChat && (!thisChat.title || thisChat.title === "New chat")) {
        const newTitle = text.slice(0, 48);
        setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)));
        renameChat(id, newTitle).catch(() => {});
      }
    }

    // Optimistic user message
    setMessages((prev) => [...prev, { role: "user", content: [{ text }] }]);

    const res = await fetch(`${API}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: text, chat_id: id }),
    });
    if (!res.ok || !res.body) {
      setError("Error streaming response");
      setStreaming(false);
      return;
    }

    // Stream assistant chunks
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let assistantText = "";
    setMessages((prev) => [...prev, { role: "assistant", content: [{ text: "" }] }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value);
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: [{ text: assistantText }] };
        return copy;
      });
    }

    setStreaming(false);
  }

  // --- Docs upload (new UI section; optional backend at /docs/upload) ---
  async function uploadDocs(files) {
    if (!files?.length) return;
    const form = new FormData();
    for (const f of files) form.append("files", f);
    try {
      const res = await fetch(`${API}/docs/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      // Optional: you can toast a small confirmation by setting error to "" and maybe console.log
      return await res.json().catch(() => ({}));
    } catch (e) {
      console.error(e);
      setError("Failed to upload documents");
      throw e;
    }
  }

  const initials = me ? getInitials(me.username || me.email || "") : "U";

  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        chats={chats}
        currentId={currentId}
        loading={loadingChats}
        error={error}
        onNewChat={() => createChat().then(() => {})}
        onSelectChat={(id) => loadChat(id)}
        onRenameChat={(id, title) => renameChat(id, title)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <Topbar
          title={currentId ? "Conversation" : "Start a new conversation"}
          streaming={streaming}
          onLogout={handleLogout}
          initials={initials}
          userLabel={me?.username || me?.email || "User"}
        />

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <ChatMessages messages={messages} />
        </div>

        {/* Composer + Docs */}
        <ChatInput onSend={sendMessage} ref={inputRef} disabled={streaming} onUploadDocs={uploadDocs} />
      </div>
    </div>
  );
}
