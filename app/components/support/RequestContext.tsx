"use client";

import { Check, Plus, X } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { dateTime, personName, PRIORITY_LABELS, relativeTime, requestReference, STATUS_LABELS } from "@/lib/support/format";
import type {
  SupportActivity,
  SupportConversation,
  SupportPerson,
  SupportPriority,
  SupportStatus,
  SupportTodo,
} from "@/lib/support/types";
import styles from "./support.module.css";

const statuses: SupportStatus[] = ["open", "in_progress", "waiting_on_user", "resolved", "closed"];
const priorities: SupportPriority[] = ["low", "normal", "high", "urgent"];
const contextTabs = ["activity", "details", "todos"] as const;

export function RequestContext({
  idPrefix = "request-context",
  conversation,
  agents,
  activity,
  todos,
  agentsError,
  activityError,
  todosError,
  onPatch,
  onAddTodo,
  onToggleTodo,
  onRetryAgents,
  onRetryActivity,
  onRetryTodos,
}: {
  idPrefix?: string;
  conversation: SupportConversation;
  agents: SupportPerson[];
  activity: SupportActivity[];
  todos: SupportTodo[];
  agentsError?: string | null;
  activityError?: string | null;
  todosError?: string | null;
  onPatch: (patch: { status?: SupportStatus; priority?: SupportPriority; assigneeId?: string | null }) => Promise<void>;
  onAddTodo: (title: string) => Promise<void>;
  onToggleTodo: (todo: SupportTodo) => Promise<void>;
  onRetryAgents?: () => void;
  onRetryActivity?: () => void;
  onRetryTodos?: () => void;
}) {
  const [todoTitle, setTodoTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof contextTabs)[number]>("activity");
  const todoInputId = `${idPrefix}-new-todo`;

  async function submitTodo(event: FormEvent) {
    event.preventDefault();
    const title = todoTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await onAddTodo(title);
      setTodoTitle("");
    } catch {
      // The parent keeps the draft and surfaces the backend error in its toast.
    } finally {
      setAdding(false);
    }
  }

  function moveTabFocus(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % contextTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + contextTabs.length) % contextTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = contextTabs.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(contextTabs[nextIndex]);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']")[nextIndex]?.focus();
  }

  return (
    <div className={styles.contextPanel}>
      <div className={styles.contextTabs} role="tablist" aria-label="Request context views">
        {contextTabs.map((tab, index) => (
          <button
            className={activeTab === tab ? styles.contextTabActive : ""}
            type="button"
            role="tab"
            id={`${idPrefix}-${tab}-tab`}
            aria-controls={`${idPrefix}-${tab}-panel`}
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            key={tab}
            onClick={() => setActiveTab(tab)}
            onKeyDown={(event) => moveTabFocus(event, index)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}{tab === "todos" && todos.length ? ` ${todos.length}` : ""}
          </button>
        ))}
      </div>

      <div className={styles.contextTabContent} aria-label="Request context content" tabIndex={0}>
        <section
          className={styles.contextSection}
          id={`${idPrefix}-activity-panel`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-activity-tab`}
          hidden={activeTab !== "activity"}
        >
          <h3>Recent activity</h3>
          {activityError && !activity.length ? (
            <div className={styles.contextError} role="alert">
              <span>Activity could not be loaded.</span>
              {onRetryActivity ? <button type="button" onClick={onRetryActivity}>Try again</button> : null}
            </div>
          ) : activity.length ? (
            <ol className={styles.contextActivity}>
              {activity.slice(0, 30).map((item) => (
                <li key={item.id}>
                  <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                  {item.summary}
                  {item.actor ? <><br /><span>{personName(item.actor)}</span></> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.contextEmpty}>No activity recorded yet.</p>
          )}
        </section>

        <section
          className={styles.contextSection}
          id={`${idPrefix}-details-panel`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-details-tab`}
          hidden={activeTab !== "details"}
        >
          <h3>Request details</h3>
          <dl className={styles.detailList}>
            <div className={styles.detailItem}>
              <dt>Customer</dt>
              <dd>{personName(conversation.user)}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Category</dt>
              <dd>{conversation.category === "error" ? "Error report" : conversation.category[0].toUpperCase() + conversation.category.slice(1)}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Source</dt>
              <dd className={styles.capitalize}>{conversation.source}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Assignee</dt>
              <dd>
                <select
                  className={styles.contextSelect}
                  aria-label="Request assignee"
                  value={conversation.assignee?.id || ""}
                  disabled={Boolean(agentsError)}
                  onChange={(event) => void onPatch({ assigneeId: event.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => {
                    const id = agent.id;
                    return <option value={id} key={id}>{personName(agent)}</option>;
                  })}
                </select>
                {agentsError ? (
                  <span className={styles.contextFieldError} role="alert">
                    Agents unavailable.{onRetryAgents ? <button type="button" onClick={onRetryAgents}>Retry</button> : null}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Status</dt>
              <dd>
                <select className={styles.contextSelect} aria-label="Request status" value={conversation.status} onChange={(event) => void onPatch({ status: event.target.value as SupportStatus })}>
                  {statuses.map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}
                </select>
              </dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Priority</dt>
              <dd>
                <select className={styles.contextSelect} aria-label="Request priority" value={conversation.priority} onChange={(event) => void onPatch({ priority: event.target.value as SupportPriority })}>
                  {priorities.map((priority) => <option value={priority} key={priority}>{PRIORITY_LABELS[priority]}</option>)}
                </select>
              </dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Request ID</dt>
              <dd>{requestReference(conversation.id)}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>Created</dt>
              <dd>{dateTime(conversation.createdAt)}</dd>
            </div>
          </dl>
          {conversation.diagnostics && Object.keys(conversation.diagnostics).length ? (
            <details className={styles.contextDiagnostics}>
              <summary>Reported environment</summary>
              <dl>
                {Object.entries(conversation.diagnostics).map(([key, value]) => (
                  <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{String(value ?? "—")}</dd></div>
                ))}
              </dl>
            </details>
          ) : null}
        </section>

        <section
          className={styles.contextSection}
          id={`${idPrefix}-todos-panel`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-todos-tab`}
          hidden={activeTab !== "todos"}
        >
          <h3>Todos</h3>
          <form className={styles.todoComposer} onSubmit={submitTodo}>
            <label className="sr-only" htmlFor={todoInputId}>Add todo</label>
            <input id={todoInputId} value={todoTitle} onChange={(event) => setTodoTitle(event.target.value)} placeholder="Add a follow-up" maxLength={300} />
            <button className={styles.miniButton} type="submit" disabled={!todoTitle.trim() || adding} aria-label="Add todo"><Plus size={16} /></button>
          </form>
          {todosError && !todos.length ? (
            <div className={styles.contextError} role="alert">
              <span>Todos could not be loaded.</span>
              {onRetryTodos ? <button type="button" onClick={onRetryTodos}>Try again</button> : null}
            </div>
          ) : todos.length ? todos.map((todo) => (
            <div className={styles.contextTodo} key={todo.id}>
              <button
                className={`${styles.checkbox} ${todo.status === "done" ? styles.checkboxDone : ""}`}
                type="button"
                aria-label={`${todo.status === "done" ? "Reopen" : "Complete"} ${todo.title}`}
                onClick={() => void onToggleTodo(todo)}
              >
                {todo.status === "done" ? <Check size={12} /> : null}
              </button>
              <span>
                <strong>{todo.title}</strong>
                <span>{todo.dueAt ? `Due ${relativeTime(todo.dueAt)}` : `${PRIORITY_LABELS[todo.priority]} priority`}</span>
              </span>
            </div>
          )) : <p className={styles.contextEmpty}>No todos for this request.</p>}
        </section>
      </div>
    </div>
  );
}

export function RequestDetailsDrawer({
  conversation,
  agents,
  activity,
  todos,
  agentsError,
  activityError,
  todosError,
  open,
  onClose,
  onPatch,
  onAddTodo,
  onToggleTodo,
  onRetryAgents,
  onRetryActivity,
  onRetryTodos,
}: {
  conversation: SupportConversation;
  agents: SupportPerson[];
  activity: SupportActivity[];
  todos: SupportTodo[];
  agentsError?: string | null;
  activityError?: string | null;
  todosError?: string | null;
  open: boolean;
  onClose: () => void;
  onPatch: (patch: { status?: SupportStatus; priority?: SupportPriority; assigneeId?: string | null }) => Promise<void>;
  onAddTodo: (title: string) => Promise<void>;
  onToggleTodo: (todo: SupportTodo) => Promise<void>;
  onRetryAgents?: () => void;
  onRetryActivity?: () => void;
  onRetryTodos?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog className={styles.detailsDialog} ref={dialogRef} onCancel={onClose} onClose={onClose} aria-labelledby="request-details-title">
      <div className={styles.detailsDialogHeader}>
        <div>
          <span>Support request</span>
          <h2 id="request-details-title">Request context</h2>
        </div>
        <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close request details"><X size={18} /></button>
      </div>
      <div className={styles.detailsDialogBody}>
        <RequestContext
          idPrefix="drawer-request-context"
          conversation={conversation}
          agents={agents}
          activity={activity}
          todos={todos}
          agentsError={agentsError}
          activityError={activityError}
          todosError={todosError}
          onPatch={onPatch}
          onAddTodo={onAddTodo}
          onToggleTodo={onToggleTodo}
          onRetryAgents={onRetryAgents}
          onRetryActivity={onRetryActivity}
          onRetryTodos={onRetryTodos}
        />
      </div>
    </dialog>
  );
}
