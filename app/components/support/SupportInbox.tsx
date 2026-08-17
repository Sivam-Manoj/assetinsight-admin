"use client";

import { RefreshCw, Search, X } from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { supportRequest, supportUploadAttachment } from "@/lib/support/client";
import type {
  SupportActivity,
  SupportConversation,
  SupportMessage,
  SupportPerson,
  SupportPriority,
  SupportStatus,
  SupportTodo,
  SupportUploadConstraints,
} from "@/lib/support/types";
import { ConversationList } from "./ConversationList";
import { MessageThread, type PreparedFile } from "./MessageThread";
import { RequestContext, RequestDetailsDrawer } from "./RequestContext";
import styles from "./support.module.css";

type ListResponse<T> = { items: T[]; nextCursor?: string | null };
type ConversationResponse = { conversation: SupportConversation };
type ConstraintsResponse = { constraints: SupportUploadConstraints };
type ResourceState<T> = { path: string | null; data: T | null; error: Error | null; loading: boolean };
type CursorTail<T> = {
  key: string;
  items: T[];
  nextCursor: string | null;
  loading: boolean;
  error: Error | null;
};

const defaultConstraints: SupportUploadConstraints = {
  imageContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"],
  videoContentTypes: ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"],
  maxImageBytes: 20 * 1024 * 1024,
  maxVideoBytes: 250 * 1024 * 1024,
  maxAttachmentsPerMessage: 8,
  maxPendingUploads: 8,
};

const emptyConversations: SupportConversation[] = [];
const emptyMessages: SupportMessage[] = [];
const emptyActivity: SupportActivity[] = [];
const emptyTodos: SupportTodo[] = [];
const emptyAgents: SupportPerson[] = [];

/**
 * Small visibility-aware polling hook. Support data changes while an agent is
 * reading, but polling is paused in background tabs to avoid unnecessary load.
 */
function useSupportResource<T>(path: string | null, intervalMs: number) {
  const [state, setState] = useState<ResourceState<T>>({ path, data: null, error: null, loading: Boolean(path) });
  const activePath = useRef(path);
  const sequence = useRef(0);
  const inFlight = useRef<{
    path: string;
    sequence: number;
    controller: AbortController;
    promise: Promise<void>;
  } | null>(null);
  activePath.current = path;

  const load = useCallback((showLoading = false): Promise<void> => {
    if (!path) return Promise.resolve();
    if (inFlight.current?.path === path) return inFlight.current.promise;

    // A path change invalidates the previous response. The sequence check also
    // protects the A -> B -> A case where path equality alone is insufficient.
    inFlight.current?.controller.abort();
    const requestSequence = ++sequence.current;
    const controller = new AbortController();
    if (showLoading) {
      setState((current) => current.path === path
        ? { ...current, loading: current.data === null }
        : { path, data: null, error: null, loading: true });
    }

    const promise = supportRequest<T>(path, { signal: controller.signal })
      .then((data) => {
        if (activePath.current !== path || sequence.current !== requestSequence) return;
        setState({ path, data, error: null, loading: false });
      })
      .catch((error) => {
        if (controller.signal.aborted || activePath.current !== path || sequence.current !== requestSequence) return;
        setState((current) => ({
          path,
          data: current.path === path ? current.data : null,
          error: error instanceof Error ? error : new Error("The support service could not be reached."),
          loading: false,
        }));
      })
      .finally(() => {
        if (inFlight.current?.sequence === requestSequence) inFlight.current = null;
      });
    inFlight.current = { path, sequence: requestSequence, controller, promise };
    return promise;
  }, [path]);

  useEffect(() => {
    if (!path) return;
    void load(true);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    const timer = intervalMs ? window.setInterval(refreshWhenVisible, intervalMs) : null;
    if (intervalMs) document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      if (timer !== null) window.clearInterval(timer);
      if (intervalMs) document.removeEventListener("visibilitychange", refreshWhenVisible);
      if (inFlight.current?.path === path) {
        inFlight.current.controller.abort();
        inFlight.current = null;
      }
      sequence.current += 1;
    };
  }, [intervalMs, load, path]);

  const current = state.path === path ? state : { path, data: null, error: null, loading: Boolean(path) };
  return {
    ...current,
    refresh: () => load(false),
    setData: (data: T) => setState({ path, data, error: null, loading: false }),
  };
}

function mergeUniqueById<T extends { id: string }>(...groups: T[][]): T[] {
  const seen = new Set<string>();
  return groups.flatMap((group) => group.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }));
}

function errorStatus(error: Error | null): number | null {
  if (!error || !("status" in error)) return null;
  const status = (error as Error & { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function updateRequestUrl(requestId: string | null) {
  const url = new URL(window.location.href);
  if (requestId) url.searchParams.set("request", requestId);
  else url.searchParams.delete("request");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function SupportInbox({ initialRequest = null }: { initialRequest?: string | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(initialRequest);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [status, setStatus] = useState<SupportStatus | "">("");
  const [pendingFiles, setPendingFiles] = useState<PreparedFile[]>([]);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const retryClientMessageId = useRef<string | null>(null);
  const readAcknowledgement = useRef<{ conversationId: string | null; candidate: string | null; inFlight: boolean }>({
    conversationId: null,
    candidate: null,
    inFlight: false,
  });

  const listPath = useMemo(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (status) params.set("status", status);
    if (deferredQuery) params.set("query", deferredQuery);
    return `conversations?${params.toString()}`;
  }, [deferredQuery, status]);

  const messagePath = selectedId ? `conversations/${selectedId}/messages?limit=100` : null;
  const listResource = useSupportResource<ListResponse<SupportConversation>>(listPath, 15_000);
  const conversationResource = useSupportResource<ConversationResponse>(selectedId ? `conversations/${selectedId}` : null, 15_000);
  const messagesResource = useSupportResource<ListResponse<SupportMessage>>(messagePath, 8_000);
  const activityResource = useSupportResource<ListResponse<SupportActivity>>(selectedId ? `conversations/${selectedId}/activity?limit=40` : null, 15_000);
  const todosResource = useSupportResource<ListResponse<SupportTodo>>(selectedId ? `conversations/${selectedId}/todos` : null, 15_000);
  const agentsResource = useSupportResource<ListResponse<SupportPerson>>("agents", 0);
  const constraintsResource = useSupportResource<ConstraintsResponse>("constraints", 0);

  const [conversationTail, setConversationTail] = useState<CursorTail<SupportConversation>>({
    key: listPath,
    items: [],
    nextCursor: null,
    loading: false,
    error: null,
  });
  const [messageHead, setMessageHead] = useState<CursorTail<SupportMessage>>({
    key: selectedId || "",
    items: [],
    nextCursor: null,
    loading: false,
    error: null,
  });

  const activeConversationTail = conversationTail.key === listPath ? conversationTail : null;
  const activeMessageHead = messageHead.key === (selectedId || "") ? messageHead : null;
  const conversations = mergeUniqueById(
    listResource.data?.items || emptyConversations,
    activeConversationTail?.items || emptyConversations,
  );
  const conversation = conversationResource.data?.conversation || conversations.find((item) => item.id === selectedId) || null;
  const messages = mergeUniqueById(
    activeMessageHead?.items || emptyMessages,
    messagesResource.data?.items || emptyMessages,
  );
  const activity = activityResource.data?.items || emptyActivity;
  const todos = todosResource.data?.items || emptyTodos;
  const agents = agentsResource.data?.items || emptyAgents;
  const constraints = constraintsResource.data?.constraints || defaultConstraints;
  const conversationNextCursor = activeConversationTail?.items.length
    ? activeConversationTail.nextCursor
    : listResource.data?.nextCursor || null;
  const messageNextCursor = activeMessageHead?.items.length
    ? activeMessageHead.nextCursor
    : messagesResource.data?.nextCursor || null;
  const refreshConversationList = listResource.refresh;
  const refreshSelectedConversation = conversationResource.refresh;

  useEffect(() => {
    const handleExpiredSession = () => window.location.replace("/login");
    window.addEventListener("admin-session-expired", handleExpiredSession);
    return () => window.removeEventListener("admin-session-expired", handleExpiredSession);
  }, []);

  useEffect(() => {
    setConversationTail({ key: listPath, items: [], nextCursor: null, loading: false, error: null });
  }, [listPath]);

  useEffect(() => {
    setMessageHead({ key: selectedId || "", items: [], nextCursor: null, loading: false, error: null });
    readAcknowledgement.current = { conversationId: selectedId, candidate: null, inFlight: false };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || errorStatus(conversationResource.error) !== 404) return;
    // A stale bookmarked URL must not strand a phone-sized layout in an empty
    // thread pane with the request list hidden.
    setSelectedId(null);
    setPendingFiles([]);
    retryClientMessageId.current = null;
    setDetailsOpen(false);
    setNotice("That support request no longer exists.");
    updateRequestUrl(null);
  }, [conversationResource.error, selectedId]);

  const latestCustomerMessageId = useMemo(
    () => messages.findLast((message) => message.senderRole === "user")?.id || null,
    [messages],
  );

  useEffect(() => {
    if (!selectedId) return;
    const tracker = readAcknowledgement.current;
    if (tracker.conversationId !== selectedId) {
      tracker.conversationId = selectedId;
      tracker.candidate = null;
      tracker.inFlight = false;
    }
    const fallbackUnreadCandidate = conversation?.unread.agent
      ? `unread:${conversation.lastMessage?.at || conversation.updatedAt}:${conversation.unread.agent}`
      : null;
    const candidate = latestCustomerMessageId || fallbackUnreadCandidate;
    if (!candidate || tracker.candidate === candidate || tracker.inFlight) return;

    tracker.inFlight = true;
    // Mark the selected thread as read again when polling reveals a newer
    // customer message, not only when the agent first selects the request.
    supportRequest(`conversations/${selectedId}/read`, { method: "POST", body: "{}" })
      .then(() => {
        if (readAcknowledgement.current.conversationId !== selectedId) return;
        readAcknowledgement.current.candidate = candidate;
        void Promise.allSettled([refreshConversationList(), refreshSelectedConversation()]);
      })
      .catch(() => undefined)
      .finally(() => {
        if (readAcknowledgement.current.conversationId === selectedId) {
          readAcknowledgement.current.inFlight = false;
        }
      });
    // A fresh messages payload intentionally retries a failed best-effort read.
  }, [conversation?.lastMessage?.at, conversation?.unread.agent, conversation?.updatedAt, latestCustomerMessageId, messagesResource.data, refreshConversationList, refreshSelectedConversation, selectedId]);

  function selectConversation(id: string) {
    if (sending || id === selectedId) return;
    setSelectedId(id);
    setPendingFiles([]);
    retryClientMessageId.current = null;
    setDetailsOpen(false);
    setNotice("");
    updateRequestUrl(id);
  }

  function closeConversation() {
    if (sending) return;
    setSelectedId(null);
    setPendingFiles([]);
    retryClientMessageId.current = null;
    setDetailsOpen(false);
    setNotice("");
    updateRequestUrl(null);
  }

  function changeStatus(nextStatus: SupportStatus | "") {
    if (sending) return;
    setStatus(nextStatus);
    closeConversation();
  }

  async function loadMoreConversations() {
    if (!conversationNextCursor || activeConversationTail?.loading) return;
    const requestKey = listPath;
    const cursor = conversationNextCursor;
    setConversationTail((current) => ({
      key: requestKey,
      items: current.key === requestKey ? current.items : [],
      nextCursor: current.key === requestKey ? current.nextCursor : null,
      loading: true,
      error: null,
    }));
    try {
      const page = await supportRequest<ListResponse<SupportConversation>>(
        `${requestKey}&cursor=${encodeURIComponent(cursor)}`,
      );
      setConversationTail((current) => current.key !== requestKey ? current : {
        key: requestKey,
        items: mergeUniqueById(current.items, page.items),
        nextCursor: page.nextCursor || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setConversationTail((current) => current.key !== requestKey ? current : {
        ...current,
        loading: false,
        error: error instanceof Error ? error : new Error("Older requests could not be loaded."),
      });
    }
  }

  async function loadOlderMessages() {
    if (!selectedId || !messageNextCursor || activeMessageHead?.loading) return;
    const requestKey = selectedId;
    const cursor = messageNextCursor;
    setMessageHead((current) => ({
      key: requestKey,
      items: current.key === requestKey ? current.items : [],
      nextCursor: current.key === requestKey ? current.nextCursor : null,
      loading: true,
      error: null,
    }));
    try {
      const page = await supportRequest<ListResponse<SupportMessage>>(
        `conversations/${requestKey}/messages?limit=100&before=${encodeURIComponent(cursor)}`,
      );
      setMessageHead((current) => current.key !== requestKey ? current : {
        key: requestKey,
        items: mergeUniqueById(page.items, current.items),
        nextCursor: page.nextCursor || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setMessageHead((current) => current.key !== requestKey ? current : {
        ...current,
        loading: false,
        error: error instanceof Error ? error : new Error("Older messages could not be loaded."),
      });
    }
  }

  function addFiles(files: File[]) {
    retryClientMessageId.current = null;
    const next = [...pendingFiles];
    let validationNotice = "";

    for (const file of files) {
      const isImage = constraints.imageContentTypes.includes(file.type);
      const isVideo = constraints.videoContentTypes.includes(file.type);
      if (!isImage && !isVideo) {
        validationNotice = `${file.name} is not a supported image or video.`;
        continue;
      }
      const sizeLimit = isImage ? constraints.maxImageBytes : constraints.maxVideoBytes;
      if (file.size > sizeLimit) {
        validationNotice = `${file.name} exceeds the ${Math.round(sizeLimit / 1024 / 1024)} MB ${isImage ? "image" : "video"} limit.`;
        continue;
      }
      const attachmentLimit = Math.min(constraints.maxAttachmentsPerMessage, constraints.maxPendingUploads);
      if (next.length >= attachmentLimit) {
        validationNotice = `A message can contain at most ${attachmentLimit} attachments.`;
        break;
      }
      next.push({ id: crypto.randomUUID(), file, progress: 0, state: "queued" });
    }

    setPendingFiles(next);
    setNotice(validationNotice);
  }

  async function uploadPreparedFile(conversationId: string, prepared: PreparedFile): Promise<string> {
    if (prepared.attachmentId) return prepared.attachmentId;

    setPendingFiles((current) => current.map((item) => item.id === prepared.id
      ? { ...item, error: undefined, progress: 0, state: "uploading" }
      : item));
    try {
      const uploaded = await supportUploadAttachment(conversationId, prepared.file, (progress) => {
        setPendingFiles((current) => current.map((item) => item.id === prepared.id
          ? { ...item, progress, state: "uploading" }
          : item));
      });
      setPendingFiles((current) => current.map((item) => item.id === prepared.id
        ? { ...item, attachmentId: uploaded.attachment.id, progress: 100, state: "ready" }
        : item));
      return uploaded.attachment.id;
    } catch (error) {
      setPendingFiles((current) => current.map((item) => item.id === prepared.id
        ? { ...item, error: errorMessage(error, `Upload failed for ${prepared.file.name}`), state: "error" }
        : item));
      throw error;
    }
  }

  async function refreshConversationData() {
    await Promise.allSettled([
      messagesResource.refresh(),
      conversationResource.refresh(),
      listResource.refresh(),
      activityResource.refresh(),
      todosResource.refresh(),
    ]);
  }

  async function sendMessage(body: string, internalNote: boolean): Promise<boolean> {
    if (!selectedId || sending) return false;
    if (internalNote && pendingFiles.length) {
      setNotice("Internal notes cannot include customer-visible attachments.");
      return false;
    }

    setSending(true);
    setNotice("");
    try {
      if (internalNote) {
        await supportRequest(`conversations/${selectedId}/notes`, {
          method: "POST",
          body: JSON.stringify({ body }),
        });
      } else {
        // The same UUID survives upload or send failures. Retrying therefore
        // cannot create a duplicate customer-visible reply.
        retryClientMessageId.current ||= crypto.randomUUID();
        const prepared = [...pendingFiles];
        const uploadResults = await Promise.allSettled(prepared.map((file) => uploadPreparedFile(selectedId, file)));
        const failedUpload = uploadResults.find((result) => result.status === "rejected");
        if (failedUpload?.status === "rejected") throw failedUpload.reason;
        const attachmentIds = uploadResults.map((result) => result.status === "fulfilled" ? result.value : "").filter(Boolean);

        await supportRequest(`conversations/${selectedId}/messages`, {
          method: "POST",
          body: JSON.stringify({ body, attachmentIds, clientMessageId: retryClientMessageId.current }),
          signal: AbortSignal.timeout(45_000),
        });
      }

      setPendingFiles([]);
      retryClientMessageId.current = null;
      void refreshConversationData();
      return true;
    } catch (error) {
      setNotice(errorMessage(error, "The reply could not be sent."));
      return false;
    } finally {
      setSending(false);
    }
  }

  async function patchConversation(patch: { status?: SupportStatus; priority?: SupportPriority; assigneeId?: string | null }) {
    if (!selectedId) return;
    setNotice("");
    try {
      const updated = await supportRequest<ConversationResponse>(`conversations/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      conversationResource.setData(updated);
      await Promise.allSettled([listResource.refresh(), activityResource.refresh()]);
    } catch (error) {
      setNotice(errorMessage(error, "The request could not be updated."));
    }
  }

  async function addTodo(title: string) {
    if (!selectedId) return;
    try {
      await supportRequest(`conversations/${selectedId}/todos`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      await Promise.allSettled([todosResource.refresh(), activityResource.refresh()]);
    } catch (error) {
      setNotice(errorMessage(error, "The todo could not be added."));
      throw error;
    }
  }

  async function toggleTodo(todo: SupportTodo) {
    if (!selectedId) return;
    try {
      await supportRequest(`conversations/${selectedId}/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: todo.status === "done" ? "todo" : "done" }),
      });
      await Promise.allSettled([todosResource.refresh(), activityResource.refresh()]);
    } catch (error) {
      setNotice(errorMessage(error, "The todo could not be updated."));
    }
  }

  return (
    <div className={styles.supportPage}>
      <div className={`${styles.workspace} ${selectedId ? styles.hasSelection : ""}`}>
        <aside className={styles.conversationRail} aria-label="Support requests">
          <header className={styles.inboxHeader}>
            <div className={styles.eyebrow}>Customer operations</div>
            <div className={styles.inboxTitleRow}>
              <div>
                <h1>Support</h1>
                <span>{listResource.error ? "Service unavailable" : `${conversations.length} loaded`}</span>
              </div>
              <button className={styles.refreshButton} type="button" onClick={() => void listResource.refresh()} aria-label="Refresh support inbox">
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.inboxFilters}>
              <div className={styles.searchWrap}>
                <Search className={styles.searchIcon} size={16} aria-hidden="true" />
                <label className="sr-only" htmlFor="admin-support-search">Search request subject or message</label>
                <input id="admin-support-search" className={styles.search} type="search" placeholder="Search subject or message" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <label className="sr-only" htmlFor="admin-support-status">Filter requests by status</label>
              <select id="admin-support-status" className={styles.select} value={status} disabled={sending} onChange={(event) => changeStatus(event.target.value as SupportStatus | "")}>
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="waiting_on_user">Waiting</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </header>
          <div className={styles.railTop}><span>Requests</span><span>Newest activity</span></div>
          <div className={styles.conversationListScroller}>
            {listResource.error && !conversations.length ? (
              <div className={styles.errorState}>
                <span>The inbox could not be loaded.</span>
                <button type="button" onClick={() => void listResource.refresh()}>Try again</button>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                loading={listResource.loading}
                loadingMore={Boolean(activeConversationTail?.loading)}
                loadMoreError={activeConversationTail?.error ? errorMessage(activeConversationTail.error, "Older requests could not be loaded.") : null}
                hasMore={Boolean(conversationNextCursor)}
                disabled={sending}
                onSelect={selectConversation}
                onLoadMore={() => void loadMoreConversations()}
              />
            )}
          </div>
        </aside>

        <section className={styles.threadPanel} aria-label="Selected support conversation">
          <MessageThread
            key={conversation?.id || "empty-thread"}
            conversation={conversation}
            messages={messages}
            loading={conversationResource.loading || messagesResource.loading}
            messagesError={messagesResource.error ? errorMessage(messagesResource.error, "The conversation messages could not be loaded.") : null}
            olderMessagesError={activeMessageHead?.error ? errorMessage(activeMessageHead.error, "Older messages could not be loaded.") : null}
            hasOlderMessages={Boolean(messageNextCursor)}
            loadingOlderMessages={Boolean(activeMessageHead?.loading)}
            pendingFiles={pendingFiles}
            acceptedTypes={[...constraints.imageContentTypes, ...constraints.videoContentTypes].join(",")}
            sending={sending}
            onBack={closeConversation}
            onFiles={addFiles}
            onRemoveFile={(id) => {
              retryClientMessageId.current = null;
              setPendingFiles((current) => current.filter((item) => item.id !== id));
            }}
            onDraftChanged={() => { retryClientMessageId.current = null; }}
            onRetryMessages={() => void messagesResource.refresh()}
            onLoadOlderMessages={() => void loadOlderMessages()}
            onSend={sendMessage}
            onResolve={() => patchConversation({ status: "resolved" })}
            onOpenDetails={() => setDetailsOpen(true)}
          />
        </section>

        <aside className={styles.contextRail} aria-label="Request context">
          {conversation ? (
            <RequestContext
              idPrefix="desktop-request-context"
              conversation={conversation}
              agents={agents}
              activity={activity}
              todos={todos}
              agentsError={agentsResource.error ? errorMessage(agentsResource.error, "Agents could not be loaded.") : null}
              activityError={activityResource.error ? errorMessage(activityResource.error, "Activity could not be loaded.") : null}
              todosError={todosResource.error ? errorMessage(todosResource.error, "Todos could not be loaded.") : null}
              onRetryAgents={() => void agentsResource.refresh()}
              onRetryActivity={() => void activityResource.refresh()}
              onRetryTodos={() => void todosResource.refresh()}
              onPatch={patchConversation}
              onAddTodo={addTodo}
              onToggleTodo={toggleTodo}
            />
          ) : <div className={styles.empty}>Select a request.</div>}
        </aside>
      </div>

      {conversation ? (
        <RequestDetailsDrawer
          conversation={conversation}
          agents={agents}
          activity={activity}
          todos={todos}
          agentsError={agentsResource.error ? errorMessage(agentsResource.error, "Agents could not be loaded.") : null}
          activityError={activityResource.error ? errorMessage(activityResource.error, "Activity could not be loaded.") : null}
          todosError={todosResource.error ? errorMessage(todosResource.error, "Todos could not be loaded.") : null}
          onRetryAgents={() => void agentsResource.refresh()}
          onRetryActivity={() => void activityResource.refresh()}
          onRetryTodos={() => void todosResource.refresh()}
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          onPatch={patchConversation}
          onAddTodo={addTodo}
          onToggleTodo={toggleTodo}
        />
      ) : null}

      {notice ? (
        <div className={styles.notice} role="alert">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={15} /></button>
        </div>
      ) : null}
    </div>
  );
}
