import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#6366f1"),
  status: text("status", { enum: ["active", "archived", "completed"] }).notNull().default("active"),
  ownerClerkUserId: text("owner_clerk_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const projectMembersTable = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id").notNull(),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectInvitesTable = pgTable("project_invites", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  invitedByClerkUserId: text("invited_by_clerk_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectMemberSchema = createInsertSchema(projectMembersTable).omit({ id: true, joinedAt: true });
export const insertProjectInviteSchema = createInsertSchema(projectInvitesTable).omit({ id: true, createdAt: true });

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type InsertProjectInvite = z.infer<typeof insertProjectInviteSchema>;
export type Project = typeof projectsTable.$inferSelect;
export type ProjectMember = typeof projectMembersTable.$inferSelect;
export type ProjectInvite = typeof projectInvitesTable.$inferSelect;
