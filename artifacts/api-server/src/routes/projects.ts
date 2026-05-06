import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { db, projectsTable, projectMembersTable, tasksTable, usersTable, activityTable } from "@workspace/db";
import { eq, and, count, sql, inArray } from "drizzle-orm";
import { requireAuth, getClerkUserId } from "../lib/auth";
import {
  CreateProjectBody,
  UpdateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
  ListProjectMembersParams,
  AddProjectMemberBody,
  UpdateProjectMemberParams,
  UpdateProjectMemberBody,
  RemoveProjectMemberParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichProject(project: typeof projectsTable.$inferSelect, clerkUserId: string) {
  const [memberCountRow] = await db
    .select({ count: count() })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.projectId, project.id));

  const [taskCountRow] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(eq(tasksTable.projectId, project.id));

  const [completedCountRow] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(and(eq(tasksTable.projectId, project.id), eq(tasksTable.status, "done")));

  const [myMembership] = await db
    .select()
    .from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, project.id), eq(projectMembersTable.clerkUserId, clerkUserId)));

  return {
    ...project,
    memberCount: memberCountRow?.count ?? 0,
    taskCount: taskCountRow?.count ?? 0,
    completedTaskCount: completedCountRow?.count ?? 0,
    myRole: myMembership?.role ?? null,
  };
}

// List projects for current user
router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;

  // Get project IDs user is a member of
  const memberships = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.clerkUserId, clerkUserId));

  const projectIds = memberships.map((m) => m.projectId);

  if (projectIds.length === 0) {
    res.json([]);
    return;
  }

  const projects = await db
    .select()
    .from(projectsTable)
    .where(inArray(projectsTable.id, projectIds))
    .orderBy(projectsTable.createdAt);

  const enriched = await Promise.all(projects.map((p) => enrichProject(p, clerkUserId)));
  res.json(enriched);
});

// Create project
router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.insert(projectsTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    color: parsed.data.color ?? "#6366f1",
    ownerClerkUserId: clerkUserId,
  }).returning();

  // Auto-add creator as admin
  await db.insert(projectMembersTable).values({
    projectId: project.id,
    clerkUserId,
    role: "admin",
  });

  // Log activity
  await db.insert(activityTable).values({
    type: "project_created",
    projectId: project.id,
    actorClerkUserId: clerkUserId,
    description: `created project "${project.name}"`,
  });

  const enriched = await enrichProject(project, clerkUserId);
  res.status(201).json(enriched);
});

// Get project by ID
router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProjectParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const enriched = await enrichProject(project, clerkUserId);
  res.json(enriched);
});

// Update project
router.patch("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateProjectParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Check membership
  const [membership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.clerkUserId, clerkUserId)));
  if (!membership || membership.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db.update(projectsTable)
    .set({ ...parsed.data })
    .where(eq(projectsTable.id, params.data.id))
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const enriched = await enrichProject(project, clerkUserId);
  res.json(enriched);
});

// Delete project
router.delete("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteProjectParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (project.ownerClerkUserId !== clerkUserId) {
    res.status(403).json({ error: "Only the project owner can delete it" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  res.sendStatus(204);
});

// ── Members ─────────────────────────────────────────────────────────────────

// List members
router.get("/projects/:id/members", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListProjectMembersParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Must be a member
  const [myMembership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.clerkUserId, clerkUserId)));
  if (!myMembership) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const members = await db.select().from(projectMembersTable)
    .where(eq(projectMembersTable.projectId, params.data.id));

  // Enrich with user info
  const enriched = await Promise.all(members.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, m.clerkUserId));
    return {
      id: m.id,
      projectId: m.projectId,
      clerkUserId: m.clerkUserId,
      name: user?.name ?? "Unknown",
      email: user?.email ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      role: m.role,
      joinedAt: m.joinedAt,
    };
  }));

  res.json(enriched);
});

// Add member
router.post("/projects/:id/members", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListProjectMembersParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Must be admin
  const [myMembership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.clerkUserId, clerkUserId)));
  if (!myMembership || myMembership.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = AddProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Find user by email in local DB first, then fall back to Clerk
  let [targetUser] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));

  if (!targetUser) {
    // Search Clerk for a user with this email
    try {
      const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [parsed.data.email] });
      const clerkUser = clerkUsers.data[0];
      if (!clerkUser) {
        res.status(400).json({ error: "No account found with that email address." });
        return;
      }
      // Create local user record
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "User";
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? parsed.data.email;
      const avatarUrl = clerkUser.imageUrl ?? null;
      [targetUser] = await db.insert(usersTable).values({
        clerkUserId: clerkUser.id,
        name,
        email,
        avatarUrl,
      }).returning();
    } catch {
      res.status(400).json({ error: "Could not look up that email address." });
      return;
    }
  }

  // Check not already a member
  const [existing] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.clerkUserId, targetUser.clerkUserId)));
  if (existing) {
    res.status(400).json({ error: "User is already a member" });
    return;
  }

  const [member] = await db.insert(projectMembersTable).values({
    projectId: params.data.id,
    clerkUserId: targetUser.clerkUserId,
    role: parsed.data.role,
  }).returning();

  // Log activity
  await db.insert(activityTable).values({
    type: "member_added",
    projectId: params.data.id,
    actorClerkUserId: clerkUserId,
    description: `added ${targetUser.name} to the project`,
  });

  res.status(201).json({
    id: member.id,
    projectId: member.projectId,
    clerkUserId: member.clerkUserId,
    name: targetUser.name,
    email: targetUser.email,
    avatarUrl: targetUser.avatarUrl,
    role: member.role,
    joinedAt: member.joinedAt,
  });
});

// Update member role
router.patch("/projects/:id/members/:memberId", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawMemberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
  const params = UpdateProjectMemberParams.safeParse({ id: parseInt(rawId, 10), memberId: parseInt(rawMemberId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [myMembership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.clerkUserId, clerkUserId)));
  if (!myMembership || myMembership.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const parsed = UpdateProjectMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [member] = await db.update(projectMembersTable)
    .set({ role: parsed.data.role })
    .where(and(eq(projectMembersTable.id, params.data.memberId), eq(projectMembersTable.projectId, params.data.id)))
    .returning();

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, member.clerkUserId));
  res.json({
    id: member.id,
    projectId: member.projectId,
    clerkUserId: member.clerkUserId,
    name: user?.name ?? "Unknown",
    email: user?.email ?? "",
    avatarUrl: user?.avatarUrl ?? null,
    role: member.role,
    joinedAt: member.joinedAt,
  });
});

// Remove member
router.delete("/projects/:id/members/:memberId", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawMemberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
  const params = RemoveProjectMemberParams.safeParse({ id: parseInt(rawId, 10), memberId: parseInt(rawMemberId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [myMembership] = await db.select().from(projectMembersTable)
    .where(and(eq(projectMembersTable.projectId, params.data.id), eq(projectMembersTable.clerkUserId, clerkUserId)));
  if (!myMembership || myMembership.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  await db.delete(projectMembersTable)
    .where(and(eq(projectMembersTable.id, params.data.memberId), eq(projectMembersTable.projectId, params.data.id)));

  res.sendStatus(204);
});

export default router;
