export type FocusRoomDocKind = "chat" | "task" | "task_comment" | "task_complete";

export type FocusRoomDoc = {
  id: string;
  kind: FocusRoomDocKind;
  uid: string;
  displayName: string;
  text: string;
  taskId: string | null;
  createdAtMs: number;
};

export type FocusRoomSummary = {
  activeCount: number;
  completedCount: number;
  participantNames: string[];
  ownActiveTask: FocusRoomDoc | null;
};

export function summarizeFocusRoom(docs: FocusRoomDoc[], currentUid: string | null): FocusRoomSummary {
  const completedTaskIds = new Set(
    docs
      .filter((doc) => doc.kind === "task_complete" && doc.taskId)
      .map((doc) => doc.taskId as string)
  );
  const tasks = docs.filter((doc) => doc.kind === "task");
  const activeTasks = tasks.filter((doc) => !completedTaskIds.has(doc.id));
  const participants = new Map<string, string>();

  docs
    .filter((doc) => doc.uid || doc.displayName)
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .forEach((doc) => {
      const key = doc.uid || doc.displayName;
      if (!participants.has(key)) participants.set(key, doc.displayName || "Anonim");
    });

  return {
    activeCount: activeTasks.length,
    completedCount: completedTaskIds.size,
    participantNames: Array.from(participants.values()),
    ownActiveTask: currentUid ? activeTasks.find((doc) => doc.uid === currentUid) ?? null : null,
  };
}
