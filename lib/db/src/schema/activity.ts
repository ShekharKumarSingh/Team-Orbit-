import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: text("type", {
    enum: ["task_created", "task_updated", "task_completed", "task_assigned", "comment_added", "member_added", "project_created"],
  }).notNull(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  taskId: integer("task_id"),
  actorClerkUserId: text("actor_clerk_user_id").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityTable.$inferSelect;
