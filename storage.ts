import { users, type User, type InsertUser, 
  leads, type Lead, type InsertLead,
  orders, type Order, type InsertOrder
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  findOrCreateSocialUser(email: string, name?: string): Promise<User>;
  
  // Lead methods
  getLeads(): Promise<Lead[]>;
  getAvailableLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<Lead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  
  // Order methods
  getOrders(userId?: number): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined>;
  
  // Session store for auth
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  async findOrCreateSocialUser(email: string, name?: string): Promise<User> {
    // Check if user already exists with this email
    let user = await this.getUserByEmail(email);
    
    if (user) {
      return user;
    }
    
    // Create a new user
    const randomPassword = Math.random().toString(36).slice(-10);
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    
    // Check if this username already exists (unlikely but possible)
    const existingUser = await this.getUserByUsername(username);
    if (existingUser) {
      // If the username is taken, add more random characters
      const newUsername = username + Math.floor(Math.random() * 10000);
      
      // Create user with generated username
      user = await this.createUser({
        username: newUsername,
        password: randomPassword, // This password isn't used for login but required in schema
        email,
        name,
        isAdmin: false
      });
    } else {
      // Create user with original username
      user = await this.createUser({
        username,
        password: randomPassword, // This password isn't used for login but required in schema
        email,
        name,
        isAdmin: false
      });
    }
    
    return user;
  }

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }
  
  async getAvailableLeads(): Promise<Lead[]> {
    // Return all leads regardless of status (both available and sold)
    return await db.select().from(leads)
      .orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: number, leadData: Partial<Lead>): Promise<Lead | undefined> {
    const [updatedLead] = await db
      .update(leads)
      .set(leadData)
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }

  async deleteLead(id: number): Promise<boolean> {
    const result = await db.delete(leads).where(eq(leads.id, id));
    return true; // In Postgres, no error means success
  }

  async getOrders(userId?: number): Promise<Order[]> {
    if (userId) {
      return await db.select().from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(orderData)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }
}

// In-memory storage implementation
const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: User[] = [];
  private leads: Lead[] = [];
  private orders: Order[] = [];
  private nextUserId = 1;
  private nextLeadId = 1;
  private nextOrderId = 1;
  sessionStore: any;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.nextUserId++,
      username: user.username,
      password: user.password,
      email: user.email || null,
      name: user.name || null,
      isAdmin: user.isAdmin || false
    };
    this.users.push(newUser);
    return newUser;
  }

  async findOrCreateSocialUser(email: string, name?: string): Promise<User> {
    let user = await this.getUserByEmail(email);
    
    if (user) {
      return user;
    }
    
    const randomPassword = Math.random().toString(36).slice(-10);
    const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
    
    user = await this.createUser({
      username,
      password: randomPassword,
      email,
      name,
      isAdmin: false
    });
    
    return user;
  }

  async getLeads(): Promise<Lead[]> {
    return [...this.leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAvailableLeads(): Promise<Lead[]> {
    return [...this.leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getLead(id: number): Promise<Lead | undefined> {
    return this.leads.find(lead => lead.id === id);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const newLead: Lead = {
      id: this.nextLeadId++,
      title: lead.title,
      description: lead.description,
      price: lead.price,
      city: lead.city,
      propertyType: lead.propertyType,
      status: lead.status || 'available',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.leads.push(newLead);
    return newLead;
  }

  async updateLead(id: number, leadData: Partial<Lead>): Promise<Lead | undefined> {
    const index = this.leads.findIndex(lead => lead.id === id);
    if (index === -1) return undefined;
    
    this.leads[index] = { 
      ...this.leads[index], 
      ...leadData,
      updatedAt: new Date()
    };
    return this.leads[index];
  }

  async deleteLead(id: number): Promise<boolean> {
    const index = this.leads.findIndex(lead => lead.id === id);
    if (index === -1) return false;
    
    this.leads.splice(index, 1);
    return true;
  }

  async getOrders(userId?: number): Promise<Order[]> {
    let filteredOrders = this.orders;
    if (userId) {
      filteredOrders = this.orders.filter(order => order.userId === userId);
    }
    return [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.find(order => order.id === id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const newOrder: Order = {
      id: this.nextOrderId++,
      userId: order.userId,
      leadId: order.leadId,
      status: order.status || 'pending',
      totalAmount: order.totalAmount,
      quantity: order.quantity || 1,
      paymentMethod: order.paymentMethod || 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    const index = this.orders.findIndex(order => order.id === id);
    if (index === -1) return undefined;
    
    this.orders[index] = { 
      ...this.orders[index], 
      ...orderData,
      updatedAt: new Date()
    };
    return this.orders[index];
  }
}

// Temporarily using in-memory storage due to database connectivity issues
export const storage = new MemStorage();
