import { Router, type IRouter } from "express";
import { db, tasksTable, projectsTable, projectMembersTable, usersTable, commentsTable, activityTable } from "@workspace/db";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { requireAuth, getClerkUserId } from "../lib/auth";
import {
  ListProjectTasksParams,
  ListProjectTasksQueryParams,
  CreateTaskParams,
  CreateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  ListMyTasksQueryParams,
  ListTaskCommentsParams,
  CreateTaskCommentParams,
  CreateTaskCommentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichTask(task: typeof tasksTable.$inferSelect) {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, task.projectId));
  let assigneeName: string | null = null;
  let assigneeAvatarUrl: string | null = null;
  if (task.assigneeClerkUserId) {
    const [assignee] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, task.assigneeClerkUserId));
    assigneeName = assignee?.name ?? null;
    assigneeAvatarUrl = assignee?.avatarUrl ?? null;
  }
  const commentRows = await db.select().from(commentsTable).where(eq(commentsTable.taskId, task.id));

  return {
    ...task,
    projectName: project?.name ?? "",
    assigneeName,
    assigneeAvatarUrl,
    commentCount: commentRows.length,
  };
}

// List project tasks
router.get("/projects/:id/tasks", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListProjectTasksParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Must be member
  const [membership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.clerkUserId, clerkUserId)));
  if (!membership) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const queryParams = ListProjectTasksQueryParams.safeParse(req.query);
  const conditions = [eq(tasksTable.projectId, params.data.id)];
  if (queryParams.success) {
    if (queryParams.data.status) conditions.push(eq(tasksTable.status, queryParams.data.status));
    if (queryParams.data.priority) conditions.push(eq(tasksTable.priority, queryParams.data.priority));
    if (queryParams.data.assigneeId) {
      if (queryParams.data.assigneeId === "unassigned") {
        conditions.push(isNull(tasksTable.assigneeClerkUserId));
      } else {
        conditions.push(eq(tasksTable.assigneeClerkUserId, queryParams.data.assigneeId));
      }
    }
  }

  const tasks = await db.select().from(tasksTable).where(and(...conditions));
  const enriched = await Promise.all(tasks.map(enrichTask));
  res.json(enriched);
});

// Create task
router.post("/projects/:id/tasks", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CreateTaskParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [membership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.clerkUserId, clerkUserId)));
  if (!membership) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.insert(tasksTable).values({
    projectId: params.data.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status ?? "todo",
    priority: parsed.data.priority ?? "medium",
    assigneeClerkUserId: parsed.data.assigneeClerkUserId ?? null,
    creatorClerkUserId: clerkUserId,
    dueDate: parsed.data.dueDate ?? null,
  }).returning();

  // Log activity
  await db.insert(activityTable).values({
    type: "task_created",
    projectId: params.data.id,
    taskId: task.id,
    actorClerkUserId: clerkUserId,
    description: `created task "${task.title}"`,
  });

  const enriched = await enrichTask(task);
  res.status(201).json(enriched);
});

// Get task
router.get("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetTaskParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const enriched = await enrichTask(task);
  res.json(enriched);
});

// Update task
router.patch("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateTaskParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const updates: Partial<typeof tasksTable.$inferInsert> = { ...parsed.data };

  // Set completedAt when marking done
  if (parsed.data.status === "done" && existing.status !== "done") {
    updates.completedAt = new Date();
  } else if (parsed.data.status && parsed.data.status !== "done") {
    updates.completedAt = null;
  }

  const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, params.data.id)).returning();

  // Log activity
  let activityType: "task_updated" | "task_completed" | "task_assigned" = "task_updated";
  let description = `updated task "${task.title}"`;
  if (parsed.data.status === "done" && existing.status !== "done") {
    activityType = "task_completed";
    description = `completed task "${task.title}"`;
  } else if (parsed.data.assigneeClerkUserId && parsed.data.assigneeClerkUserId !== existing.assigneeClerkUserId) {
    activityType = "task_assigned";
    const [assignee] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, parsed.data.assigneeClerkUserId));
    description = `assigned task "${task.title}" to ${assignee?.name ?? "someone"}`;
  }

  await db.insert(activityTable).values({
    type: activityType,
    projectId: task.projectId,
    taskId: task.id,
    actorClerkUserId: clerkUserId,
    description,
  });

  const enriched = await enrichTask(task);
  res.json(enriched);
});

// Delete task
router.delete("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteTaskParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  res.sendStatus(204);
});

// My tasks
router.get("/my/tasks", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const queryParams = ListMyTasksQueryParams.safeParse(req.query);

  const conditions = [eq(tasksTable.assigneeClerkUserId, clerkUserId)];
  if (queryParams.success && queryParams.data.status) {
    conditions.push(eq(tasksTable.status, queryParams.data.status));
  }

  const tasks = await db.select().from(tasksTable).where(and(...conditions));
  const enriched = await Promise.all(tasks.map(enrichTask));
  res.json(enriched);
});

// Comments
router.get("/tasks/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListTaskCommentsParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const comments = await db.select().from(commentsTable)
    .where(eq(commentsTable.taskId, params.data.id))
    .orderBy(commentsTable.createdAt);

  const enriched = await Promise.all(comments.map(async (c) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, c.clerkUserId));
    return {
      id: c.id,
      taskId: c.taskId,
      clerkUserId: c.clerkUserId,
      authorName: user?.name ?? "Unknown",
      authorAvatarUrl: user?.avatarUrl ?? null,
      content: c.content,
      createdAt: c.createdAt,
    };
  }));

  res.json(enriched);
});

router.post("/tasks/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CreateTaskCommentParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateTaskCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const [comment] = await db.insert(commentsTable).values({
    taskId: params.data.id,
    clerkUserId,
    content: parsed.data.content,
  }).returning();

  // Log activity
  await db.insert(activityTable).values({
    type: "comment_added",
    projectId: task.projectId,
    taskId: task.id,
    actorClerkUserId: clerkUserId,
    description: `commented on task "${task.title}"`,
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
  res.status(201).json({
    id: comment.id,
    taskId: comment.taskId,
    clerkUserId: comment.clerkUserId,
    authorName: user?.name ?? "Unknown",
    authorAvatarUrl: user?.avatarUrl ?? null,
    content: comment.content,
    createdAt: comment.createdAt,
  });
});

export default router;
