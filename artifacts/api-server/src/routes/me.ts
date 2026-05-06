import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getClerkUserId } from "../lib/auth";
import { GetMeResponse, UpdateMeBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);

  if (!user) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || "User";
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
      const avatarUrl = clerkUser.imageUrl ?? null;

      [user] = await db.insert(usersTable).values({
        clerkUserId,
        name,
        email,
        avatarUrl,
      }).returning();
    } catch (err) {
      res.status(500).json({ error: "Failed to create user profile" });
      return;
    }
  }

  res.json(GetMeResponse.parse({
    id: user.id,
    clerkUserId: user.clerkUserId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  }));
});

router.patch("/me", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = getClerkUserId(req)!;
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl;

  // Try update first, if no user found, create one
  let [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .returning();

  if (!user) {
    // Create user with provided data
    try {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const name = parsed.data.name || [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "User";
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
      const avatarUrl = parsed.data.avatarUrl !== undefined ? parsed.data.avatarUrl : (clerkUser.imageUrl ?? null);

      [user] = await db.insert(usersTable).values({
        clerkUserId,
        name,
        email,
        avatarUrl,
      }).returning();
    } catch {
      res.status(500).json({ error: "Failed to create user profile" });
      return;
    }
  }

  res.json(GetMeResponse.parse({
    id: user.id,
    clerkUserId: user.clerkUserId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  }));
});

export default router;
