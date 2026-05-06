import { Router, type IRouter } from "express";
import { db, tasksTable, projectsTable, projectMembersTable, activityTable, usersTable } from "@workspace/db";
import { eq, and, lt, gte, count, inArray } from "drizzle-orm";
import { requireAuth, getClerkUserId } from "../lib/auth";
import { GetProjectStatsParams, GetRecentActivityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// Dashboard summary
router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const now = new Date();

  // Get user's project IDs
  const memberships = await db.select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.clerkUserId, clerkUserId));
  const projectIds = memberships.map((m) => m.projectId);

  const [totalProjectsRow] = await db.select({ count: count() }).from(projectMembersTable)
    .where(eq(projectMembersTable.clerkUserId, clerkUserId));

  if (projectIds.length === 0) {
    res.json({
      totalProjects: 0,
      activeTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      tasksDueToday: 0,
      tasksByStatus: { todo: 0, in_progress: 0, in_review: 0, done: 0 },
      tasksByPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
    });
    return;
  }

  const allMyTasks = await db.select().from(tasksTable)
    .where(eq(tasksTable.assigneeClerkUserId, clerkUserId));

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const tasksByStatus = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
  const tasksByPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
  let overdueTasks = 0;
  let tasksDueToday = 0;
  let completedTasks = 0;
  let activeTasks = 0;

  for (const task of allMyTasks) {
    tasksByStatus[task.status]++;
    tasksByPriority[task.priority]++;

    if (task.status === "done") {
      completedTasks++;
    } else {
      activeTasks++;
      if (task.dueDate) {
        const due = new Date(task.dueDate);
        if (due < startOfToday) overdueTasks++;
        else if (due >= startOfToday && due <= endOfToday) tasksDueToday++;
      }
    }
  }

  res.json({
    totalProjects: totalProjectsRow?.count ?? 0,
    activeTasks,
    completedTasks,
    overdueTasks,
    tasksDueToday,
    tasksByStatus,
    tasksByPriority,
  });
});

// Recent activity
router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const queryParams = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = queryParams.success && queryParams.data.limit ? Math.min(queryParams.data.limit, 50) : 20;

  const memberships = await db.select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.clerkUserId, clerkUserId));
  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json([]);
    return;
  }

  const activities = await db.select().from(activityTable)
    .where(inArray(activityTable.projectId, projectIds))
    .orderBy(activityTable.createdAt)
    .limit(limit);

  // Reverse to get most recent first
  activities.reverse();

  const enriched = await Promise.all(activities.map(async (a) => {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, a.projectId));
    const [actor] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, a.actorClerkUserId));
    let taskTitle: string | null = null;
    if (a.taskId) {
      const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, a.taskId));
      taskTitle = task?.title ?? null;
    }
    return {
      id: a.id,
      type: a.type,
      projectId: a.projectId,
      projectName: project?.name ?? "",
      taskId: a.taskId,
      taskTitle,
      actorClerkUserId: a.actorClerkUserId,
      actorName: actor?.name ?? "Someone",
      actorAvatarUrl: actor?.avatarUrl ?? null,
      description: a.description,
      createdAt: a.createdAt,
    };
  }));

  res.json(enriched);
});

// Overdue tasks
router.get("/dashboard/overdue", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const now = new Date();

  const tasks = await db.select().from(tasksTable)
    .where(and(
      eq(tasksTable.assigneeClerkUserId, clerkUserId),
      lt(tasksTable.dueDate, now),
    ));

  const nonDone = tasks.filter((t) => t.status !== "done");
  const enriched = await Promise.all(nonDone.map(async (task) => {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, task.projectId));
    let assigneeName: string | null = null;
    let assigneeAvatarUrl: string | null = null;
    if (task.assigneeClerkUserId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, task.assigneeClerkUserId));
      assigneeName = u?.name ?? null;
      assigneeAvatarUrl = u?.avatarUrl ?? null;
    }
    const comments = await db.select().from(projectMembersTable); // not needed here
    return {
      ...task,
      projectName: project?.name ?? "",
      assigneeName,
      assigneeAvatarUrl,
      commentCount: 0,
    };
  }));

  res.json(enriched);
});

// Project stats
router.get("/projects/:id/stats", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProjectStatsParams.safeParse({ id: parseInt(rawId, 10) });
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

  const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, params.data.id));
  const now = new Date();

  const tasksByStatus = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
  const tasksByPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
  let completedTasks = 0;
  let inProgressTasks = 0;
  let overdueTasks = 0;

  for (const task of allTasks) {
    tasksByStatus[task.status]++;
    tasksByPriority[task.priority]++;
    if (task.status === "done") completedTasks++;
    if (task.status === "in_progress") inProgressTasks++;
    if (task.dueDate && new Date(task.dueDate) < now && task.status !== "done") overdueTasks++;
  }

  const total = allTasks.length;
  const completionRate = total > 0 ? Math.round((completedTasks / total) * 100) : 0;

  res.json({
    projectId: params.data.id,
    totalTasks: total,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    completionRate,
    tasksByStatus,
    tasksByPriority,
  });
});

export default router;
