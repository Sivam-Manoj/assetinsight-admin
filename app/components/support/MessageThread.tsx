"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  FileImage,
  FileVideo,
  Info,
  LoaderCircle,
  LockKeyhole,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { type FormEvent, useLayoutEffect, useRef, useState } from "react";

import { bytes, dateTime, initials, personName, PRIORITY_LABELS, requestReference, STATUS_LABELS } from "@/lib/support/format";
import type { SupportConversation, SupportMessage } from "@/lib/support/types";
import { AttachmentCard } from "./AttachmentCard";
import styles from "./support.module.css";

export type PreparedFile = {
  id: string;
  file: File;
  attachmentId?: string;
  error?: string;
  progress: number;
  state: "queued" | "uploading" | "ready" | "error";
};

export function MessageThread({
  conversation,
  messages,
  loading,
  messagesError,
  olderMessagesError,
  hasOlderMessages,
  loadingOlderMessages,
  pendingFiles,
  acceptedTypes,
  sending,
  onBack,
  onFiles,
  onRemoveFile,
  onDraftChanged,
  onRetryMessages,
  onLoadOlderMessages,
  onSend,
  onResolve,
  onOpenDetails,
}: {
  conversation: SupportConversation | null;
  messages: SupportMessage[];
  loading: boolean;
  messagesError: string | null;
  olderMessagesError: string | null;
  hasOlderMessages: boolean;
  loadingOlderMessages: boolean;
  pendingFiles: PreparedFile[];
  acceptedTypes: string;
  sending: boolean;
  onBack: () => void;
  onFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onDraftChanged: () => void;
  onRetryMessages: () => void;
  onLoadOlderMessages: () => void;
  onSend: (body: string, internalNote: boolean) => Promise<boolean>;
  onResolve: () => Promise<void>;
  onOpenDetails: () => void;
}) {
  const [body, setBody] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineSnapshot = useRef<{
    conversationId: string;
    firstId: string | null;
    lastId: string | null;
    scrollHeight: number;
  } | null>(null);

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || !conversation) {
      timelineSnapshot.current = null;
      return;
    }
    const firstId = messages[0]?.id || null;
    const lastId = messages.at(-1)?.id || null;
    const previous = timelineSnapshot.current;
    const prependedOlderMessages = previous?.conversationId === conversation.id
      && previous.firstId !== firstId
      && previous.lastId === lastId;

    if (prependedOlderMessages) {
      // Keep the same message under the agent's eyes when an older cursor page
      // is inserted above the current viewport.
      timeline.scrollTop += timeline.scrollHeight - previous.scrollHeight;
    } else if (!previous || previous.conversationId !== conversation.id || previous.lastId !== lastId) {
      // Only the timeline moves; scrollIntoView would also shift the page and
      // can hide the pinned composer.
      timeline.scrollTop = timeline.scrollHeight;
    }
    timelineSnapshot.current = {
      conversationId: conversation.id,
      firstId,
      lastId,
      scrollHeight: timeline.scrollHeight,
    };
  }, [conversation, messages]);

  if (!conversation) {
    return (
      <>
        <div className={styles.mobileThreadBar}>
          <button className={styles.mobileBack} type="button" onClick={onBack} disabled={sending} aria-label="Back to support inbox">
            <ChevronLeft size={23} aria-hidden="true" />
          </button>
          <span className={styles.mobileThreadIdentity}><strong>Request unavailable</strong></span>
        </div>
        <div className={styles.threadPlaceholder}>
          <span>Select a request to open the conversation.</span>
        </div>
      </>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!body.trim() && !pendingFiles.length) || sending) return;
    if (await onSend(body.trim(), internalNote)) setBody("");
  }

  function toggleInternalNote() {
    if (sending) return;
    const next = !internalNote;
    setInternalNote(next);
    onDraftChanged();
    // Internal notes are private and the backend deliberately rejects media.
    if (next) pendingFiles.forEach((item) => onRemoveFile(item.id));
  }

  return (
    <>
      <div className={styles.mobileThreadBar}>
        <button className={styles.mobileBack} type="button" onClick={onBack} disabled={sending} aria-label="Back to support inbox">
          <ChevronLeft size={23} aria-hidden="true" />
        </button>
        <span className={styles.mobileThreadIdentity}>
          <strong>{conversation.subject}</strong>
          <span><span className={styles.mobileStatusDot} />{STATUS_LABELS[conversation.status]}</span>
        </span>
        <button className={styles.mobileMore} type="button" onClick={onOpenDetails} aria-label="Open request details">
          <Info size={18} aria-hidden="true" /><span>Details</span>
        </button>
      </div>

      <header className={styles.threadHeader}>
        <span className={styles.avatar}>{initials(conversation.user)}</span>
        <div className={styles.threadIdentity}>
          <h2>{conversation.subject}</h2>
          <p>{personName(conversation.user)}</p>
          <div className={styles.threadMeta}>
            <span>{requestReference(conversation.id)}</span>
            <span className={styles.metaDot} />
            <span className={conversation.status === "resolved" ? styles.statusResolved : styles.statusText}>
              {STATUS_LABELS[conversation.status]}
            </span>
            <span className={styles.metaDot} />
            <span className={`${styles.priority} ${styles[`priority_${conversation.priority}`]}`}>
              {PRIORITY_LABELS[conversation.priority]}
            </span>
          </div>
        </div>
        <div className={styles.threadActions}>
          <button className={`${styles.buttonSecondary} ${styles.detailsButton}`} type="button" onClick={onOpenDetails}>
            <Info size={16} aria-hidden="true" />Details
          </button>
          {conversation.status !== "resolved" && conversation.status !== "closed" ? (
            <button className={styles.buttonSecondary} type="button" onClick={onResolve} disabled={sending}>
              <CheckCircle2 size={16} aria-hidden="true" />Resolve
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={styles.messageScroller}
        ref={timelineRef}
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
        tabIndex={0}
      >
        {loading && !messages.length ? (
          <div className={styles.empty}>Loading conversation…</div>
        ) : messagesError && !messages.length ? (
          <div className={styles.errorState} role="alert">
            <span>{messagesError}</span>
            <button type="button" onClick={onRetryMessages}>Try again</button>
          </div>
        ) : (
          <>
            {messagesError || hasOlderMessages || olderMessagesError ? (
              <div className={styles.paginationControls}>
                {messagesError ? <span className={styles.paginationError} role="alert">{messagesError}</span> : null}
                {olderMessagesError ? <span className={styles.paginationError} role="alert">{olderMessagesError}</span> : null}
                {messagesError ? (
                  <button className={styles.buttonSecondary} type="button" onClick={onRetryMessages}>Retry messages</button>
                ) : null}
                {hasOlderMessages ? (
                  <button className={styles.buttonSecondary} type="button" disabled={loadingOlderMessages} onClick={onLoadOlderMessages}>
                    {loadingOlderMessages ? "Loading…" : olderMessagesError ? "Retry older messages" : "Load older messages"}
                  </button>
                ) : null}
              </div>
            ) : null}
            {messages.length ? (
              <ol className={styles.messageList}>
                {messages.map((message) => {
                  const internal = message.type === "internal_note";
                  const system = message.senderRole === "system" || message.type === "system";
                  const agent = message.senderRole === "agent";
                  const display = system ? "System" : agent ? personName(message.sender) : personName(message.sender || conversation.user);
                  return (
                    <li
                      className={`${styles.messageRow} ${agent ? styles.messageAgent : ""} ${internal ? styles.internalNote : ""} ${system ? styles.systemMessage : ""}`}
                      key={message.id}
                    >
                      <span className={styles.messageAvatar}>{system ? "AI" : initials(message.sender || conversation.user)}</span>
                      <div className={styles.messageContent}>
                        <div className={styles.messageByline}>
                          <span>{display}</span>
                          <time dateTime={message.createdAt}>{dateTime(message.createdAt)}</time>
                        </div>
                        <div className={styles.messageBubble}>
                          {internal ? <span className={styles.internalLabel}>Internal note</span> : null}
                          {message.body ? <div>{message.body}</div> : null}
                          {message.attachments?.length ? (
                            <div className={styles.mediaGrid}>
                              {message.attachments.map((attachment) => (
                                <AttachmentCard attachment={attachment} key={attachment.id} />
                              ))}
                            </div>
                          ) : null}
                          {message.diagnostics && Object.keys(message.diagnostics).length ? (
                            <details className={styles.diagnostics}>
                              <summary>Diagnostics · {Object.keys(message.diagnostics).length} details</summary>
                              <dl className={styles.diagnosticGrid}>
                                {Object.entries(message.diagnostics).map(([key, value]) => (
                                  <div key={key} style={{ display: "contents" }}>
                                    <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                                    <dd>{String(value ?? "—")}</dd>
                                  </div>
                                ))}
                              </dl>
                            </details>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className={styles.empty}>No messages have been sent yet.</div>
            )}
          </>
        )}
      </div>

      <form className={styles.composer} onSubmit={submit}>
        <div className={styles.composerBox}>
          {pendingFiles.length ? (
            <ul className={styles.uploadList} aria-label="Attachments queued for this reply">
              {pendingFiles.map((item) => {
                const FileIcon = item.file.type.startsWith("video/") ? FileVideo : FileImage;
                return (
                  <li className={`${styles.uploadItem} ${item.state === "error" ? styles.uploadError : ""}`} key={item.id}>
                    <FileIcon size={16} aria-hidden="true" />
                    <span className={styles.uploadFileText}>
                      <span className={styles.uploadFileName}>{item.file.name}</span>
                      <span className={styles.uploadFileMeta}>
                        {bytes(item.file.size)} · {item.state === "ready" ? "Ready" : item.state === "uploading" ? `${item.progress}% uploaded` : item.error || "Queued"}
                      </span>
                      {item.state === "uploading" ? <progress max={100} value={item.progress} aria-label={`Uploading ${item.file.name}`} /> : null}
                    </span>
                    {item.state === "uploading" ? <LoaderCircle className={styles.uploadSpinner} size={16} aria-hidden="true" /> : item.state === "error" ? <AlertCircle size={16} aria-hidden="true" /> : null}
                    <button type="button" aria-label={`Remove ${item.file.name}`} onClick={() => onRemoveFile(item.id)} disabled={sending || item.state === "uploading"}>
                      <X size={15} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <label className="sr-only" htmlFor="admin-support-reply">
            {internalNote ? "Write an internal note" : `Write a reply to ${personName(conversation.user)}`}
          </label>
          <textarea
            id="admin-support-reply"
            value={body}
            onChange={(event) => { setBody(event.target.value); onDraftChanged(); }}
            placeholder={internalNote ? "Write an internal note…" : "Write a reply…"}
            maxLength={12_000}
            rows={2}
            disabled={sending}
          />
          <div className={styles.composerToolbar}>
            <label className={styles.composerAction} aria-disabled={internalNote || sending}>
              <Paperclip size={17} aria-hidden="true" /><span>Attach media</span>
              <input
                className="sr-only"
                type="file"
                accept={acceptedTypes}
                multiple
                disabled={internalNote || sending}
                onChange={(event) => { onFiles(Array.from(event.target.files || [])); event.target.value = ""; }}
              />
            </label>
            <span className={styles.composerSpacer} />
            <label className={styles.toggleLabel}>
              <LockKeyhole size={15} aria-hidden="true" /><span>Internal note</span>
              <button
                className={`${styles.toggle} ${internalNote ? styles.toggleOn : ""}`}
                type="button"
                role="switch"
                aria-checked={internalNote}
                aria-label="Internal note"
                onClick={toggleInternalNote}
                disabled={sending}
              />
            </label>
            <button className={styles.button} type="submit" disabled={sending || (!body.trim() && !pendingFiles.length)}>
              {sending ? "Sending…" : <><Send size={16} aria-hidden="true" /><span className={styles.sendFullLabel}>Send reply</span><span className={styles.sendShortLabel}>Send</span></>}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
