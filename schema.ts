import { pgTable, text, serial, integer, boolean, timestamp, json, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  name: text("name"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  isAdmin: true,
});

// Leads schema
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  budget: doublePrecision("budget"),
  price: doublePrecision("price").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  contactInfo: text("contact_info"),
  status: text("status").default("available"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).pick({
  title: true,
  description: true,
  location: true,
  budget: true,
  price: true,
  category: true,
  imageUrl: true,
  contactInfo: true,
  status: true,
});

// Orders schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  leadId: integer("lead_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").default("pending"),
  paymentIntentId: text("payment_intent_id"),
  customerEmail: text("customer_email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  userId: true,
  leadId: true,
  amount: true,
  status: true,
  paymentIntentId: true,
  customerEmail: true,
});

// Payment settings schema
export const paymentSettings = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  qrCodeImageUrl: text("qr_code_image_url"),
  accountDetails: text("account_details"),
  paymentInstructions: text("payment_instructions"),
  gstRate: doublePrecision("gst_rate").default(18.0), // Default 18% GST
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentSettingsSchema = createInsertSchema(paymentSettings).pick({
  qrCodeImageUrl: true,
  accountDetails: true,
  paymentInstructions: true,
  gstRate: true,
});

// Cart items schema
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  leadId: integer("lead_id").notNull(),
  quantity: integer("quantity").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).pick({
  userId: true,
  leadId: true,
  quantity: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type PaymentSettings = typeof paymentSettings.$inferSelect;
export type InsertPaymentSettings = z.infer<typeof insertPaymentSettingsSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
