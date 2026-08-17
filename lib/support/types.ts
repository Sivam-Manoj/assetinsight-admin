export type SupportStatus = "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed";
export type SupportPriority = "low" | "normal" | "high" | "urgent";
export type SupportCategory = "error" | "feature" | "question" | "other";
export type SupportSource = "web" | "mobile";
export type SupportSenderRole = "user" | "agent" | "system";
export type SupportMessageType = "message" | "internal_note" | "system";
export type SupportTodoStatus = "todo" | "in_progress" | "done" | "cancelled";

export type SupportPerson = {
  id: string;
  username: string | null;
  email: string | null;
};

export type SupportAgent = SupportPerson & {
  role: "admin" | "superadmin";
};

/** Only ready attachments are allowed to render or be claimed by a message. */
export type SupportAttachment = {
  id: string;
  type: "image" | "video";
  originalName: string;
  contentType: string;
  sizeBytes: number;
  verifiedSizeBytes: number;
  status: "ready";
  url: string;
  completedAt: string;
  createdAt: string;
};

export type SupportUploadConstraints = {
  imageContentTypes: string[];
  videoContentTypes: string[];
  maxImageBytes: number;
  maxVideoBytes: number;
  maxAttachmentsPerMessage: number;
  maxPendingUploads: number;
};

export type SupportDiagnostics = Record<string, unknown>;

export type SupportMessage = {
  id: string;
  conversationId: string;
  sender: SupportPerson | null;
  senderRole: SupportSenderRole;
  type: SupportMessageType;
  body: string;
  diagnostics: SupportDiagnostics | null;
  attachments: SupportAttachment[];
  createdAt: string;
};

export type SupportConversation = {
  id: string;
  subject: string;
  category: SupportCategory;
  source: SupportSource;
  status: SupportStatus;
  priority: SupportPriority;
  user: SupportPerson | null;
  assignee: SupportPerson | null;
  lastMessage: {
    preview: string;
    at: string;
    senderRole: SupportSenderRole;
  } | null;
  unread: { user: number; agent: number };
  messageCount: number;
  diagnostics: SupportDiagnostics | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportConversationSummary = Pick<
  SupportConversation,
  "id" | "subject" | "category" | "status" | "priority" | "user"
>;

export type SupportTodo = {
  id: string;
  conversationId: string;
  title: string;
  description: string;
  status: SupportTodoStatus;
  priority: SupportPriority;
  dueAt: string | null;
  assignee: SupportPerson | null;
  createdBy: SupportPerson | null;
  completedAt: string | null;
  conversation: SupportConversationSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportActivityConversation = Pick<
  SupportConversation,
  "id" | "subject" | "category" | "status"
>;

export type SupportActivity = {
  id: string;
  conversationId: string;
  actor: SupportPerson | null;
  type: string;
  visibleToUser: boolean;
  summary: string;
  metadata: Record<string, unknown>;
  conversation: SupportActivityConversation | null;
  createdAt: string;
};

export type SupportDashboard = {
  conversations: {
    total: number;
    unassigned: number;
    agentUnread: number;
    statuses: Record<SupportStatus, number>;
    priorities: Record<SupportPriority, number>;
  };
  todos: { open: number; overdue: number; dueToday: number };
  recent: SupportConversation[];
  recentTodos: SupportTodo[];
  recentActivity: SupportActivity[];
  generatedAt: string;
};

export type SupportCursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export type SupportConstraintsResponse = { constraints: SupportUploadConstraints };
export type SupportDashboardResponse = { dashboard: SupportDashboard };
export type SupportAgentsResponse = { items: SupportAgent[] };
export type SupportConversationResponse = { conversation: SupportConversation };
export type SupportConversationsResponse = SupportCursorPage<SupportConversation>;
export type SupportMessagesResponse = SupportCursorPage<SupportMessage>;
export type SupportMessageResponse = { message: SupportMessage };
export type SupportAttachmentResponse = { attachment: SupportAttachment };
export type SupportTodosResponse = { items: SupportTodo[] };
export type SupportTodoResponse = { todo: SupportTodo };
export type SupportTodoQueueResponse = SupportCursorPage<SupportTodo>;
export type SupportActivityResponse = SupportCursorPage<SupportActivity>;
export type SupportReadResponse = { unreadCount: number };

export type SupportConversationPatch = {
  status?: SupportStatus;
  priority?: SupportPriority;
  assigneeId?: string | null;
};

export type SupportMessageCreate = {
  body?: string;
  attachmentIds?: string[];
  /** Reuse this UUID for every retry of one logical send. */
  clientMessageId: string;
  diagnostics?: SupportDiagnostics;
};

export type SupportNoteCreate = { body: string };

export type SupportTodoCreate = {
  title: string;
  description?: string;
  priority?: SupportPriority;
  dueAt?: string | null;
  assigneeId?: string | null;
};

export type SupportTodoPatch = Partial<SupportTodoCreate> & {
  status?: SupportTodoStatus;
};

export type SupportApiErrorPayload = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};
