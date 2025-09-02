import React, { forwardRef, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Upload as UploadIcon, X, FileText, Image as ImageIcon } from "lucide-react";

const prettySize = (bytes = 0) => {
  const units = ["B", "KB", "MB", "GB"]; let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  const fixed = v < 10 && i > 0 ? 1 : 0;
  return `${v.toFixed(fixed)} ${units[i]}`;
};

const iconFor = (file) => {
  if (!file?.type) return FileText;
  if (file.type.startsWith("image/")) return ImageIcon;
  return FileText;
};

const ChatInput = forwardRef(function ChatInput(
  { onSend, disabled, onUploadDocs },
  ref
) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [openTray, setOpenTray] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend?.(t);
    setText("");
  };

  const onPickFiles = (e) => {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    setFiles((prev) => [...prev, ...list]);
    setOpenTray(true);
    e.target.value = ""; // allow re-pick same file
  };

  const onDrop = (e) => {
    e.preventDefault();
    const list = Array.from(e.dataTransfer?.files || []);
    if (!list.length) return;
    setFiles((prev) => [...prev, ...list]);
    setOpenTray(true);
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const upload = async () => {
    if (!files.length || uploading) return;
    try {
      setUploading(true);
      await onUploadDocs?.(files);
      setFiles([]);
      setOpenTray(false);
    } catch (_) {
      // parent handles errors
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="backdrop-blur bg-white/70 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
      {/* Controls Row */}
      <div className="flex items-center gap-2">
        <motion.button
          type="button"
          onClick={() => (openTray ? fileRef.current?.click() : setOpenTray(true))}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          animate={{ rotate: openTray ? 45 : 0 }}
          className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          title={openTray ? "Add files" : "Attach documents"}
        >
          <Plus className="h-5 w-5" />
        </motion.button>

        <div className="ml-auto flex items-center gap-2">
          {files.length > 0 && (
            <button
              type="button"
              onClick={upload}
              disabled={disabled || uploading}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60 inline-flex items-center gap-2"
              title="Upload selected documents"
            >
              <UploadIcon className="h-4 w-4" />
              {uploading ? "Uploading…" : `Upload ${files.length}`}
            </button>
          )}
        </div>
      </div>

      {/* Animated Dropzone / Tray */}
      <AnimatePresence initial={false}>
        {openTray && (
          <motion.div
            key="tray"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gradient-to-br from-white/70 to-gray-50/70 dark:from-gray-800/40 dark:to-gray-900/40 p-3"
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={onPickFiles}
              accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx,.csv,.xlsx,.json,image/*"
            />
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium">Drop files here</span>
              <span className="text-gray-400">or</span>
              <span className="text-indigo-600 dark:text-indigo-400">click to browse</span>
            </div>

            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((f, i) => {
                  const Icon = iconFor(f);
                  return (
                    <div
                      key={`${f.name}-${i}`}
                      className="group flex items-center gap-2 pr-2 pl-2 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                      title={f.name}
                    >
                      <Icon className="h-4 w-4 text-gray-500" />
                      <div className="min-w-0">
                        <div className="truncate max-w-[180px] text-xs text-gray-800 dark:text-gray-100">{f.name}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{prettySize(f.size)}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        className="ml-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 p-0.5"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer Row */}
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="text"
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send();
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
          }}
          className="flex-grow px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Ask anything…"
        />
        <button
          onClick={send}
          disabled={disabled}
          className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
});

export default ChatInput;
