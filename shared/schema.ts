import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Original users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// New table for inscription history
export const inscriptions = pgTable("inscriptions", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  containerName: text("container_name").notNull(),
  feeRate: integer("fee_rate").notNull(),
  inscriptionId: text("inscription_id"),
  transactionId: text("transaction_id"),
  feePaid: text("fee_paid"),
  success: boolean("success").notNull().default(false),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  metadata: jsonb("metadata")
});

export const insertInscriptionSchema = createInsertSchema(inscriptions).omit({
  id: true,
});

export type InsertInscription = z.infer<typeof insertInscriptionSchema>;
export type Inscription = typeof inscriptions.$inferSelect;

// Schema for configuration
export const configSchema = z.object({
  containerName: z.string().min(1),
  feeRate: z.number().min(1),
  containerPath: z.string().optional(),
  port: z.number().min(1025).max(65535).optional(),
  advancedMode: z.boolean().default(false)
});

export type Config = z.infer<typeof configSchema>;
