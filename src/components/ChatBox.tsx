"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  FIREBASE_RUNTIME_STORAGE_KEY,
  getFirebaseServices,
  googleProvider,
  isCompleteFirebaseConfig,
  parseFirebaseConfigInput,
} from "@/lib/firebase";

type RoomDocKind = "chat" | "task" | "task_comment" | "task_complete";

type RoomDoc = {
  id: string;
  kind: RoomDocKind;
  text: string;
  uid: string;
  displayName: string;
  taskId: string | null;
  createdAtLabel: string;
  createdAtMs: number;
};

type TaskView = {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  createdAtLabel: string;
  createdAtMs: number;
  completed: boolean;
  completedAtLabel: string | null;
  completedByName: string | null;
  completedByUid: string | null;
};

type TaskCommentView = {
  id: string;
  taskId: string;
  text: string;
  uid: string;
  displayName: string;
  createdAtLabel: string;
  createdAtMs: number;
};

type ChatBoxMode = "all" | "tasks" | "chat";

type ChatBoxProps = {
  mode?: ChatBoxMode;
};

const GUEST_NAME_STORAGE_KEY = "chillout_guest_name_v1";
const TASK_MAX_LENGTH = 220;
const TASK_COMMENT_MAX_LENGTH = 180;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRoomDocKind(value: string): value is RoomDocKind {
  return (
    value === "chat" ||
    value === "task" ||
    value === "task_comment" ||
    value === "task_complete"
  );
}

function extractErrorMeta(reason: unknown): { code: string; message: string } {
  if (typeof reason === "string") {
    return { code: "unknown", message: reason };
  }

  if (reason && typeof reason === "object") {
    const maybe = reason as { code?: unknown; message?: unknown };
    const code = typeof maybe.code === "string" ? maybe.code : "unknown";
    const message = typeof maybe.message === "string" ? maybe.message : "";
    return { code, message };
  }

  return { code: "unknown", message: "" };
}

function authHelpText(code: string, fallbackMessage: string): string {
  const normalized = code.toLowerCase();

  if (
    normalized === "auth/invalid-api-key" ||
    normalized.includes("api-key-not-valid")
  ) {
    return "Firebase API key hatalı. Vercel Environment Variables içindeki değerleri Firebase config'ten birebir kopyala.";
  }

  if (normalized === "auth/unauthorized-domain") {
    return "Bu domain Firebase > Authentication > Settings > Authorized domains listesinde olmalı.";
  }

  if (normalized === "auth/operation-not-allowed") {
    return "Firebase Authentication > Sign-in method içinde Google sağlayıcısı etkin olmalı.";
  }

  if (normalized === "auth/network-request-failed") {
    return "Ağ isteği başarısız. VPN/engel/bağlantıyı kontrol edip tekrar dene.";
  }

  if (normalized === "auth/popup-blocked") {
    return "Tarayıcı popup engelledi. İzin ver veya tekrar dene.";
  }

  if (normalized === "auth/popup-closed-by-user") {
    return "Google giriş penceresi erken kapatıldı. Tekrar dene.";
  }

  if (normalized === "auth/cancelled-popup-request") {
    return "Aynı anda birden fazla popup isteği başladı. Bir kez tıklayıp bekle.";
  }

  return (
    fallbackMessage ||
    "Firebase ayarlarını (Auth + Domain + env) kontrol edip tekrar dene."
  );
}

function guestAuthHelpText(code: string): string {
  const normalized = code.toLowerCase();

  if (
    normalized === "auth/admin-restricted-operation" ||
    normalized === "auth/operation-not-allowed"
  ) {
    return "Firebase Console > Authentication > Sign-in method içinde Anonymous sağlayıcısını Enable et.";
  }

  if (normalized === "auth/network-request-failed") {
    return "Ağ isteği başarısız. VPN/engel/bağlantıyı kontrol edip tekrar dene.";
  }

  return "Misafir giriş ayarlarını kontrol edip tekrar dene.";
}

function formatApiKeyHint(apiKey: string | undefined): string {
  if (!apiKey) {
    return "bilinmiyor";
  }
  if (apiKey.length <= 12) {
    return apiKey;
  }
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}

function formatCreatedAt(value: Date | null): string {
  if (!value) {
    return "az önce";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getDisplayName(user: User | null): string {
  if (!user) {
    return "Anonim";
  }

  return user.displayName ?? user.email ?? "Anonim";
}

function asSafeExternalUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function splitTrailingPunctuation(value: string): {
  core: string;
  trailing: string;
} {
  const trailingMatch = value.match(/[),.;!?]+$/);
  if (!trailingMatch) {
    return { core: value, trailing: "" };
  }

  const trailing = trailingMatch[0];
  const core = value.slice(0, -trailing.length);
  return { core, trailing };
}

function renderTextWithLinks(text: string): ReactNode {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let linkIndex = 0;

  for (const match of text.matchAll(urlRegex)) {
    const start = match.index ?? 0;
    const rawUrl = match[0];
    const { core, trailing } = splitTrailingPunctuation(rawUrl);

    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }

    const safeUrl = asSafeExternalUrl(core);
    if (safeUrl) {
      nodes.push(
        <a
          key={`msg-link-${linkIndex}`}
          className="message-link"
          href={safeUrl}
          target="_blank"
          rel="noreferrer"
        >
          {core}
        </a>
      );
      linkIndex += 1;
    } else {
      nodes.push(rawUrl);
    }

    if (trailing) {
      nodes.push(trailing);
    }

    cursor = start + rawUrl.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return <>{nodes}</>;
}

export function ChatBox({ mode = "all" }: ChatBoxProps) {
  const [services, setServices] = useState(() => getFirebaseServices());
  const [user, setUser] = useState<User | null>(null);
  const [roomDocs, setRoomDocs] = useState<RoomDoc[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [taskDraft, setTaskDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openTaskComments, setOpenTaskComments] = useState<Record<string, boolean>>({});
  const [guestName, setGuestName] = useState("");
  const [isGuestNameLocked, setIsGuestNameLocked] = useState(false);
  const [chatVisibleCount, setChatVisibleCount] = useState(6);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCompletingTaskId, setIsCompletingTaskId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [setupDraft, setSetupDraft] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const auth = services?.auth ?? null;
  const db = services?.db ?? null;
  const isFirebaseConfigured = Boolean(services);
  const isGoogleUser = Boolean(
    user?.providerData.some((provider) => provider.providerId === "google.com")
  );
  const guestNameClean = guestName.trim();
  const showTasks = mode === "all" || mode === "tasks";
  const showChat = mode === "all" || mode === "chat";
  const showAuthControls = true;
  const cardTitle =
    showTasks && !showChat ? "Yapılan İşler" : "Dinlen Sohbeti (Tek Oda)";

  useEffect(() => {
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(GUEST_NAME_STORAGE_KEY) ?? "";
    const cleaned = stored.trim();
    if (cleaned.startsWith("{")) {
      try {
        const parsed = JSON.parse(cleaned) as { name?: unknown; locked?: unknown };
        const name =
          typeof parsed.name === "string" ? parsed.name.trim().slice(0, 40) : "";
        const locked = parsed.locked === true;
        if (name) {
          setGuestName(name);
          setIsGuestNameLocked(locked);
        }
        return;
      } catch {
        window.localStorage.removeItem(GUEST_NAME_STORAGE_KEY);
      }
    }

    const legacyName = cleaned.slice(0, 40);
    if (legacyName) {
      setGuestName(legacyName);
      setIsGuestNameLocked(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!guestNameClean) {
      window.localStorage.removeItem(GUEST_NAME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      GUEST_NAME_STORAGE_KEY,
      JSON.stringify({
        name: guestNameClean,
        locked: isGuestNameLocked,
      })
    );
  }, [guestNameClean, isGuestNameLocked]);

  useEffect(() => {
    if (!db) {
      return;
    }

    const cutoffTimestamp = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const roomQuery = query(
      collection(db, "singleRoomMessages"),
      where("createdAt", ">=", cutoffTimestamp),
      orderBy("createdAt", "desc"),
      limit(500)
    );

    const unsubscribe = onSnapshot(
      roomQuery,
      (snapshot) => {
        const next = snapshot.docs
          .map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            const rawKind = asString(data.type).trim();
            if (!isRoomDocKind(rawKind)) {
              return null;
            }
            const kind: RoomDocKind = rawKind;
            const createdAtDate = (
              data.createdAt as { toDate?: () => Date } | undefined
            )?.toDate?.() ?? null;

            return {
              id: doc.id,
              kind,
              text: asString(data.text),
              uid: asString(data.uid),
              displayName: asString(data.displayName) || "Anonim",
              taskId: asString(data.taskId) || null,
              createdAtLabel: formatCreatedAt(createdAtDate),
              createdAtMs: createdAtDate ? createdAtDate.getTime() : 0,
            } satisfies RoomDoc;
          })
          .filter((item): item is RoomDoc => Boolean(item))
          .sort((a, b) => a.createdAtMs - b.createdAtMs);

        setRoomDocs(next);
      },
      () => {
        setError("Veriler alınamadı. Firestore izinlerini kontrol et.");
      }
    );

    return () => unsubscribe();
  }, [db]);

  const chatMessages = useMemo(
    () =>
      roomDocs.filter(
        (doc) => doc.kind === "chat" && doc.text.trim().length > 0
      ),
    [roomDocs]
  );

  const taskCommentsByTask = useMemo(() => {
    const grouped: Record<string, TaskCommentView[]> = {};

    roomDocs
      .filter((doc) => doc.kind === "task_comment" && Boolean(doc.taskId))
      .forEach((doc) => {
        const taskId = doc.taskId;
        if (!taskId) {
          return;
        }

        if (!grouped[taskId]) {
          grouped[taskId] = [];
        }

        grouped[taskId].push({
          id: doc.id,
          taskId,
          text: doc.text,
          uid: doc.uid,
          displayName: doc.displayName,
          createdAtLabel: doc.createdAtLabel,
          createdAtMs: doc.createdAtMs,
        });
      });

    Object.values(grouped).forEach((items) => {
      items.sort((a, b) => a.createdAtMs - b.createdAtMs);
    });

    return grouped;
  }, [roomDocs]);

  const tasks = useMemo(() => {
    const completionByTaskId = new Map<string, RoomDoc>();

    roomDocs
      .filter((doc) => doc.kind === "task_complete" && Boolean(doc.taskId))
      .forEach((doc) => {
        const taskId = doc.taskId;
        if (!taskId || completionByTaskId.has(taskId)) {
          return;
        }
        completionByTaskId.set(taskId, doc);
      });

    return roomDocs
      .filter((doc) => doc.kind === "task")
      .map((task) => {
        const completion = completionByTaskId.get(task.id);
        return {
          id: task.id,
          text: task.text,
          uid: task.uid,
          displayName: task.displayName,
          createdAtLabel: task.createdAtLabel,
          createdAtMs: task.createdAtMs,
          completed: Boolean(completion),
          completedAtLabel: completion?.createdAtLabel ?? null,
          completedByName: completion?.displayName ?? null,
          completedByUid: completion?.uid ?? null,
        } satisfies TaskView;
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [roomDocs]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.completed),
    [tasks]
  );

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed);
    const finishedByUsers = new Set(
      completed.map((task) => task.completedByUid || task.uid)
    );

    return {
      totalTasks: tasks.length,
      completedTasks: completed.length,
      completedUserCount: finishedByUsers.size,
      activeTasks: tasks.length - completed.length,
    };
  }, [tasks]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, chatVisibleCount]);

  const canUseGuestMode = isGuestNameLocked && guestNameClean.length > 0;
  const canSendChat =
    (isGoogleUser || canUseGuestMode) && chatDraft.trim().length > 0;
  const canSendTask = isGoogleUser && taskDraft.trim().length > 0;
  const visibleChatMessages = useMemo(() => {
    if (chatMessages.length <= chatVisibleCount) {
      return chatMessages;
    }

    return chatMessages.slice(chatMessages.length - chatVisibleCount);
  }, [chatMessages, chatVisibleCount]);
  const hiddenChatMessageCount = Math.max(0, chatMessages.length - visibleChatMessages.length);

  const statusText = useMemo(() => {
    if (!user) {
      if (mode === "tasks") {
        return "İş eklemek için Google ile giriş yap. Sohbet ve yorum için kullanıcı adıyla misafir olarak katılabilirsin.";
      }
      return "Google ile giriş yapanlar tüm özellikleri kullanır. Giriş olmadan kullanıcı adıyla sohbet ve yorum yapabilirsin.";
    }

    if (!isGoogleUser) {
      return "Misafir modundasın. Sohbet ve yorum yapabilirsin. İş paylaşımı ve tamamlandı işaretleme için Google ile giriş yap.";
    }

    if (mode === "tasks") {
      return "Yaptığın işi paylaşabilir, bitirdiğinde tamamlandı olarak işaretleyebilirsin.";
    }

    if (mode === "chat") {
      return "Google ile giriş yaptın. Genel sohbete anında yazabilirsin.";
    }

    return "Google ile giriş yaptın. Genel sohbete yazabilir, yaptığın işi paylaşabilir, bitince tamamlandı olarak işaretleyebilirsin.";
  }, [isGoogleUser, mode, user]);

  const handleSetupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSetupError(null);

    const parsed = parseFirebaseConfigInput(setupDraft);
    if (!parsed || !isCompleteFirebaseConfig(parsed)) {
      setSetupError("Firebase config eksik veya format hatalı.");
      return;
    }

    try {
      window.localStorage.setItem(
        FIREBASE_RUNTIME_STORAGE_KEY,
        JSON.stringify(parsed)
      );

      const next = getFirebaseServices(parsed);
      if (!next) {
        setSetupError("Config kaydedildi ama Firebase başlatılamadı.");
        return;
      }

      setServices(next);
      setSetupDraft("");
      setError(null);
      setIsSigningIn(false);
    } catch {
      setSetupError("Config kaydedilemedi. Tarayıcı izinlerini kontrol et.");
    }
  };

  const handleResetRuntimeConfig = () => {
    window.localStorage.removeItem(FIREBASE_RUNTIME_STORAGE_KEY);
    setServices(getFirebaseServices());
    setUser(null);
    setRoomDocs([]);
    setChatDraft("");
    setTaskDraft("");
    setCommentDrafts({});
    setSetupDraft("");
    setSetupError(null);
    setIsSigningIn(false);
  };

  const handleLogin = async () => {
    if (!auth) {
      return;
    }

    setError(null);
    setIsSigningIn(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (reason) {
      const popupMeta = extractErrorMeta(reason);
      const code = popupMeta.code;
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/operation-not-supported-in-this-environment" ||
        code === "auth/cancelled-popup-request"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectReason) {
          const redirectMeta = extractErrorMeta(redirectReason);
          setError(
            `Google girişi başarısız (${redirectMeta.code}). ${authHelpText(
              redirectMeta.code,
              redirectMeta.message
            )}`
          );
          return;
        }
      }

      const keyHint = formatApiKeyHint(services?.config.apiKey);
      const sourceHint = services?.source ?? "bilinmiyor";
      setError(
        `Google girişi başarısız (${code}). ${authHelpText(
          code,
          popupMeta.message
        )} (Kaynak: ${sourceHint}, Key: ${keyHint})`
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
  };

  const handleSendChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!db) {
      return;
    }

    const cleaned = chatDraft.trim();
    if (!cleaned) {
      return;
    }

    let actor = user;
    let authorName = "";

    if (isGoogleUser && actor) {
      authorName = getDisplayName(actor);
    } else {
      if (!canUseGuestMode) {
        setError("Sohbete katılmak için önce kullanıcı adını yazıp ✓ ile onayla.");
        return;
      }

      authorName = guestNameClean;

      if (!actor) {
        if (!auth) {
          setError("Sohbet servisi hazır değil. Sayfayı yenileyip tekrar dene.");
          return;
        }

        try {
          const credential = await signInAnonymously(auth);
          actor = credential.user;
        } catch (reason) {
          const meta = extractErrorMeta(reason);
          setError(
            `Misafir sohbeti açılamadı (${meta.code}). ${guestAuthHelpText(meta.code)}`
          );
          return;
        }
      }
    }

    if (!actor) {
      setError("Sohbet mesajı gönderilemedi. Tekrar dene.");
      return;
    }

    setError(null);

    try {
      await addDoc(collection(db, "singleRoomMessages"), {
        type: "chat",
        text: cleaned,
        uid: actor.uid,
        displayName: authorName,
        createdAt: serverTimestamp(),
      });
      setChatDraft("");
    } catch {
      setError("Sohbet mesajı gönderilemedi. Firestore izinlerini kontrol et.");
    }
  };

  const handleSendTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!db || !user || !isGoogleUser) {
      setError("İş paylaşımı için Google ile giriş yap.");
      return;
    }

    const cleaned = taskDraft.trim().slice(0, TASK_MAX_LENGTH);
    if (!cleaned) {
      setError("İş metni boş olamaz.");
      return;
    }

    setError(null);

    try {
      await addDoc(collection(db, "singleRoomMessages"), {
        type: "task",
        text: cleaned,
        uid: user.uid,
        displayName: getDisplayName(user),
        createdAt: serverTimestamp(),
      });
      setTaskDraft("");
    } catch (reason) {
      const meta = extractErrorMeta(reason);
      setError(
        `İş paylaşımı gönderilemedi (${meta.code}). Firestore izinlerini kontrol et.`
      );
    }
  };

  const handleCommentDraftChange = (taskId: string, value: string) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [taskId]: value.slice(0, TASK_COMMENT_MAX_LENGTH),
    }));
  };

  const toggleTaskComments = (taskId: string) => {
    setOpenTaskComments((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleConfirmGuestName = () => {
    const cleaned = guestNameClean.slice(0, 40);
    if (cleaned.length < 2) {
      setError("Kullanıcı adı en az 2 karakter olmalı.");
      return;
    }

    setGuestName(cleaned);
    setIsGuestNameLocked(true);
    setError(null);
  };

  const handleSendComment = async (
    event: FormEvent<HTMLFormElement>,
    taskId: string
  ) => {
    event.preventDefault();

    if (!db) {
      return;
    }

    const cleaned = (commentDrafts[taskId] ?? "")
      .trim()
      .slice(0, TASK_COMMENT_MAX_LENGTH);
    if (!cleaned) {
      return;
    }

    let actor = user;
    let authorName = "";

    if (isGoogleUser && actor) {
      authorName = getDisplayName(actor);
    } else {
      if (!canUseGuestMode) {
        setError("Yorum için önce kullanıcı adını yazıp ✓ ile onayla.");
        return;
      }

      authorName = guestNameClean;

      if (!actor) {
        if (!auth) {
          setError("Yorum servisi hazır değil. Sayfayı yenileyip tekrar dene.");
          return;
        }

        try {
          const credential = await signInAnonymously(auth);
          actor = credential.user;
        } catch (reason) {
          const meta = extractErrorMeta(reason);
          setError(
            `Misafir yorumu açılamadı (${meta.code}). ${guestAuthHelpText(meta.code)}`
          );
          return;
        }
      }
    }

    if (!actor) {
      setError("Yorum gönderilemedi. Tekrar dene.");
      return;
    }

    setError(null);

    try {
      await addDoc(collection(db, "singleRoomMessages"), {
        type: "task_comment",
        taskId,
        text: cleaned,
        uid: actor.uid,
        displayName: authorName,
        createdAt: serverTimestamp(),
      });

      setCommentDrafts((prev) => ({
        ...prev,
        [taskId]: "",
      }));
    } catch {
      setError("Yorum gönderilemedi. Firestore izinlerini kontrol et.");
    }
  };

  const handleCompleteTask = async (task: TaskView) => {
    if (!db || !user || !isGoogleUser) {
      return;
    }

    if (task.completed) {
      return;
    }

    if (task.uid !== user.uid) {
      setError("Bu işi yalnızca paylaşan kişi tamamlandı olarak işaretleyebilir.");
      return;
    }

    setError(null);
    setIsCompletingTaskId(task.id);

    try {
      await addDoc(collection(db, "singleRoomMessages"), {
        type: "task_complete",
        taskId: task.id,
        text: "Tamamlandı",
        uid: user.uid,
        displayName: getDisplayName(user),
        createdAt: serverTimestamp(),
      });
    } catch {
      setError("İş tamamlandı olarak işaretlenemedi. Firestore izinlerini kontrol et.");
    } finally {
      setIsCompletingTaskId(null);
    }
  };

  const renderTaskCard = (task: TaskView) => {
    const comments = taskCommentsByTask[task.id] ?? [];
    const isCommentsOpen = openTaskComments[task.id] ?? false;
    const canMarkComplete = isGoogleUser && user?.uid === task.uid && !task.completed;
    const commentDraft = commentDrafts[task.id] ?? "";
    const canCommentSubmit =
      commentDraft.trim().length > 0 &&
      (isGoogleUser || canUseGuestMode);

    return (
      <article
        key={task.id}
        className={`task-card ${task.completed ? "is-completed" : ""}`}
      >
        <div className="task-head">
          <strong>{task.displayName}</strong>
          <span className="meta-line">{task.createdAtLabel}</span>
        </div>

        <p className="task-text">{renderTextWithLinks(task.text)}</p>

        <div className="task-status-row">
          {task.completed ? (
            <span className="task-status done">
              ✓ Tamamlandı
              {task.completedByName ? ` • ${task.completedByName}` : ""}
              {task.completedAtLabel ? ` • ${task.completedAtLabel}` : ""}
            </span>
          ) : (
            <span className="task-status progress">Devam ediyor</span>
          )}

          {canMarkComplete ? (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => handleCompleteTask(task)}
              disabled={isCompletingTaskId === task.id}
            >
              {isCompletingTaskId === task.id ? "İşaretleniyor..." : "✓ Tamamladım"}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="ghost-btn task-comments-toggle"
          onClick={() => toggleTaskComments(task.id)}
          aria-expanded={isCommentsOpen}
        >
          {isCommentsOpen ? "Yorumları Gizle" : `Yorumlar (${comments.length})`}
        </button>

        {isCommentsOpen ? (
          <div className="task-comments">
            {comments.length === 0 ? (
              <p className="meta-line">Henüz yorum yok.</p>
            ) : (
              comments.map((comment) => (
                <article key={comment.id} className="task-comment">
                  <div className="task-comment-head">
                    <strong>{comment.displayName}</strong>
                    <span>{comment.createdAtLabel}</span>
                  </div>
                  <p>{renderTextWithLinks(comment.text)}</p>
                </article>
              ))
            )}

            <form className="chat-form" onSubmit={(event) => handleSendComment(event, task.id)}>
              <input
                type="text"
                placeholder={
                  isGoogleUser
                    ? "Bu işe yorum yaz..."
                    : "Yorum yaz. Göndermek için üstte nick yazıp ✓ ile onayla..."
                }
                value={commentDraft}
                onChange={(event) =>
                  handleCommentDraftChange(task.id, event.target.value)
                }
                maxLength={TASK_COMMENT_MAX_LENGTH}
              />
              <button
                type="submit"
                className="secondary-btn"
                disabled={!canCommentSubmit}
              >
                Yorumla
              </button>
            </form>
            <p className="meta-line char-counter">
              {commentDraft.length}/{TASK_COMMENT_MAX_LENGTH}
            </p>
          </div>
        ) : null}
      </article>
    );
  };

  if (!isFirebaseConfigured) {
    return (
      <article className="soft-card chat-shell">
        <h2>{cardTitle}</h2>
        <p>
          Hızlı kurulum: Firebase web uygulama config&apos;ini buraya yapıştır,
          {showTasks && showChat
            ? "sohbet ve iş paylaşımı anında aktif olsun."
            : showTasks
              ? "iş paylaşımı anında aktif olsun."
              : "sohbet anında aktif olsun."}
        </p>

        <form onSubmit={handleSetupSubmit} className="chat-shell">
          <textarea
            rows={7}
            placeholder={`{
  "apiKey": "...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}`}
            value={setupDraft}
            onChange={(event) => setSetupDraft(event.target.value)}
          />
          <div className="inline-controls">
            <button type="submit" className="action-btn">
              Config Kaydet ve Bölümü Aç
            </button>
          </div>
        </form>

        <p className="meta-line">
          Firebase Console &gt; Project settings &gt; Your apps &gt; SDK setup and
          config &gt; Config
        </p>

        {setupError ? <p className="error-text">{setupError}</p> : null}
      </article>
    );
  }

  return (
    <article className="soft-card chat-shell">
      <h2>{cardTitle}</h2>

      {showAuthControls ? <p>{statusText}</p> : null}

      {showAuthControls && services?.source === "runtime" ? (
        <div className="inline-controls" style={{ justifyContent: "space-between" }}>
          <p className="meta-line" style={{ margin: 0 }}>
            Firebase ayarı tarayıcıda kayıtlı.
          </p>
          <button
            type="button"
            className="ghost-btn"
            onClick={handleResetRuntimeConfig}
          >
            Config Sıfırla
          </button>
        </div>
      ) : null}

      {showAuthControls ? (
        <div className="inline-controls">
          {!isGoogleUser ? (
            <button
              type="button"
              className="action-btn"
              onClick={handleLogin}
              disabled={isSigningIn}
            >
              {isSigningIn ? "Google açılıyor..." : "Google ile Giriş Yap"}
            </button>
          ) : null}

          {user ? (
            <>
              <p className="meta-line" style={{ margin: 0 }}>
                {isGoogleUser ? (
                  <>
                    Giriş: <strong>{getDisplayName(user)}</strong>
                  </>
                ) : (
                  <>
                    Misafir: <strong>{guestNameClean || "Kullanıcı adı yok"}</strong>
                  </>
                )}
              </p>
              <button type="button" className="ghost-btn" onClick={handleLogout}>
                Çıkış
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <p className="meta-line">{statusText}</p>
      )}

      {!isGoogleUser ? (
        <section className="guest-name-box" aria-label="Misafir yorum adı">
          <label htmlFor="guest-name-input">Misafir kullanıcı adı</label>
          <div className="guest-name-row">
            <input
              id="guest-name-input"
              type="text"
              value={guestName}
              onChange={(event) => setGuestName(event.target.value.slice(0, 40))}
              placeholder="Örn: Ardıç"
              disabled={isGuestNameLocked}
              maxLength={40}
            />
            <button
              type="button"
              className="secondary-btn"
              onClick={handleConfirmGuestName}
              disabled={isGuestNameLocked || guestNameClean.length < 2}
              aria-label="Kullanıcı adını onayla"
              title="Kullanıcı adını onayla"
            >
              <Check size={16} aria-hidden="true" />
            </button>
            {isGuestNameLocked ? (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setIsGuestNameLocked(false)}
              >
                Düzenle
              </button>
            ) : null}
          </div>
          <p className="meta-line">
            {isGuestNameLocked
              ? `Nick onaylandı: ${guestNameClean}. Bu modda sohbet ve yorum yapabilirsin.`
              : "Nickini yazıp ✓ ile onayla. Sonra sohbet ve yorum yapabilirsin."} İş paylaşımı için Google girişi gerekir.
          </p>
        </section>
      ) : null}

      {showTasks ? (
        <>
          <section className="task-intake" aria-label="Yapılan işi paylaş">
            <h3>Ne üzerinde çalışıyorsun?</h3>
            <form className="chat-form" onSubmit={handleSendTask}>
              <input
                type="text"
                placeholder={
                  isGoogleUser
                    ? "Örn: Ardıç vibecoding ile jeopolitik harita yapıyor."
                    : mode === "tasks"
                      ? "İş paylaşımı için Google ile giriş yap..."
                      : "İş paylaşmak için Google ile giriş yap..."
                }
                value={taskDraft}
                onChange={(event) =>
                  setTaskDraft(event.target.value.slice(0, TASK_MAX_LENGTH))
                }
                disabled={!isGoogleUser}
                maxLength={TASK_MAX_LENGTH}
              />
              <button type="submit" className="secondary-btn" disabled={!canSendTask}>
                Paylaş
              </button>
            </form>
            <p className="meta-line char-counter">
              {taskDraft.length}/{TASK_MAX_LENGTH}
            </p>
          </section>

          <section className="task-stats" aria-label="İş istatistikleri">
            <span className="stats-pill">
              Toplam iş: <strong>{stats.totalTasks}</strong>
            </span>
            <span className="stats-pill">
              Tamamlanan iş: <strong>{stats.completedTasks}</strong>
            </span>
            <span className="stats-pill">
              Devam eden: <strong>{stats.activeTasks}</strong>
            </span>
            <span className="stats-pill">
              İş bitiren kişi: <strong>{stats.completedUserCount}</strong>
            </span>
          </section>

          <section className="task-list" aria-label="Paylaşılan işler">
            <div className="task-list-section">
              <div className="task-section-head">
                <h3>Aktif İşler</h3>
                <span className="task-count-pill">{activeTasks.length}</span>
              </div>
              {activeTasks.length === 0 ? (
                <p className="meta-line">Aktif iş yok. Yeni bir iş paylaşabilirsin.</p>
              ) : (
                activeTasks.map((task) => renderTaskCard(task))
              )}
            </div>

            <div className="task-list-section">
              <div className="task-section-head">
                <h3>Biten İşler</h3>
                <span className="task-count-pill">{completedTasks.length}</span>
              </div>
              {completedTasks.length === 0 ? (
                <p className="meta-line">Henüz tamamlanan iş yok.</p>
              ) : (
                completedTasks.map((task) => renderTaskCard(task))
              )}
            </div>
          </section>
        </>
      ) : null}

      {showChat ? (
        <>
          <h3>Genel Sohbet</h3>
          <p className="meta-line">
            Son 24 saatin sohbeti gösterilir. Varsayılan görünüm: son 6 mesaj.
          </p>

          <div className="chat-list" role="log" aria-live="polite">
            {chatMessages.length === 0 ? (
              <p className="meta-line">Henüz mesaj yok. İlk mesajı bırakabilirsin.</p>
            ) : (
              visibleChatMessages.map((message) => (
                <article key={message.id} className="chat-message">
                  <strong>
                    {message.displayName} - {message.createdAtLabel}
                  </strong>
                  <p>{renderTextWithLinks(message.text)}</p>
                </article>
              ))
            )}
            <div ref={endRef} />
          </div>

          {hiddenChatMessageCount > 0 ? (
            <div className="inline-controls">
              <button
                type="button"
                className="ghost-btn"
                onClick={() =>
                  setChatVisibleCount((prev) => Math.min(prev + 6, chatMessages.length))
                }
              >
                Daha eski 6 mesajı göster
              </button>
            </div>
          ) : null}

          <form className="chat-form" onSubmit={handleSendChat}>
            <input
              type="text"
              placeholder={
                isGoogleUser
                  ? "Sohbete mesaj yaz..."
                  : "Misafir sohbeti için üstte nick yazıp ✓ ile onayla..."
              }
              value={chatDraft}
              onChange={(event) => setChatDraft(event.target.value)}
              disabled={!isGoogleUser && !canUseGuestMode}
              maxLength={240}
            />
            <button type="submit" className="secondary-btn" disabled={!canSendChat}>
              Gönder
            </button>
          </form>
        </>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}
    </article>
  );
}
