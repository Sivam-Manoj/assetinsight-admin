"use client";

import { initials, personName, PRIORITY_LABELS, relativeTime, requestReference, STATUS_LABELS } from "@/lib/support/format";
import type { SupportConversation } from "@/lib/support/types";
import styles from "./support.module.css";

export function ConversationList({
  conversations,
  selectedId,
  loading,
  loadingMore,
  loadMoreError,
  hasMore,
  disabled = false,
  onSelect,
  onLoadMore,
}: {
  conversations: SupportConversation[];
  selectedId: string | null;
  loading: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  hasMore: boolean;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onLoadMore: () => void;
}) {
  if (loading) {
    return (
      <div aria-label="Loading support requests">
        {Array.from({ length: 7 }, (_, index) => (
          <div className={styles.conversationButton} key={index}>
            <span className={`${styles.skeleton} ${styles.avatar}`} />
            <span>
              <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
              <span className={`${styles.skeleton} ${styles.skeletonLine}`} style={{ display: "block", width: "72%", marginTop: 9 }} />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return <div className={styles.empty}>No requests match the current filters.</div>;
  }

  return (
    <>
      <div aria-busy={loadingMore}>
        {conversations.map((conversation) => {
          const selected = conversation.id === selectedId;
          return (
            <button
              className={`${styles.conversationButton} ${selected ? styles.conversationSelected : ""}`}
              type="button"
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              aria-pressed={selected}
              disabled={disabled}
            >
              <span className={styles.avatar}>{initials(conversation.user)}</span>
              <span className={styles.conversationMain}>
                <span className={styles.conversationNameLine}>
                  <span className={styles.conversationName}>{personName(conversation.user)}</span>
                  {conversation.unread?.agent ? (
                    <span className={styles.unreadDot} aria-label={`${conversation.unread.agent} unread messages`} />
                  ) : null}
                </span>
                <span className={styles.conversationSubject}>{conversation.subject}</span>
                <span className={styles.conversationPreview}>{conversation.lastMessage?.preview || requestReference(conversation.id)}</span>
              </span>
              <span className={styles.conversationSide}>
                <time dateTime={conversation.lastMessage?.at || conversation.updatedAt}>
                  {relativeTime(conversation.lastMessage?.at || conversation.updatedAt)}
                </time>
                <span className={styles.conversationState}>
                  <span className={styles.statusText}>{STATUS_LABELS[conversation.status]}</span>
                  <span aria-hidden="true">·</span>
                  <span className={`${styles.priority} ${styles[`priority_${conversation.priority}`]}`}>
                    {PRIORITY_LABELS[conversation.priority]}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {hasMore || loadMoreError ? (
        <div className={styles.paginationControls}>
          {loadMoreError ? <span className={styles.paginationError} role="alert">{loadMoreError}</span> : null}
          {hasMore ? (
            <button
              className={styles.buttonSecondary}
              type="button"
              disabled={disabled || loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? "Loading…" : loadMoreError ? "Retry older requests" : "Load older requests"}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
