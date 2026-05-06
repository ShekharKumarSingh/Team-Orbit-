import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function getClerkUserId(req: Request): string | null {
  const { userId } = getAuth(req);
  return userId ?? null;
}

export async function getOrCreateUser(clerkUserId: string, name: string, email: string, avatarUrl?: string | null) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);
  if (existing.length > 0) {
    return existing[0];
  }
  const [user] = await db.insert(usersTable).values({
    clerkUserId,
    name,
    email,
    avatarUrl: avatarUrl ?? null,
  }).returning();
  return user;
}
