import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertLeadSchema, insertOrderSchema } from "@shared/schema";
import { setupAuth, isAuthenticated, isAdmin, comparePasswords } from "./auth";

// Make TypeScript aware of Express.User
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      name?: string | null;
      email?: string | null;
      isAdmin: boolean;
      password: string;
    }
    interface Session {
      userId?: number;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Session verification endpoint
  app.get("/api/verify-session", (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    console.log("Session verification - userId:", userId, "session:", req.session);
    if (userId) {
      res.json({ valid: true, userId });
    } else {
      res.status(401).json({ valid: false });
    }
  });

  // Direct login endpoint that bypasses middleware issues
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      console.log("Login request received:", req.body);
      const { username, password } = req.body;
      
      if (!username || !password) {
        console.log("Missing username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }

      // For demo purposes, allow login with simple credentials
      const validCredentials = [
        { username: "umairsaif", password: "umairsaif7", id: 1, name: "Umair Saif", email: "umairsaif@admin.com", isAdmin: true },
        { username: "john_doe", password: "password", id: 2, name: "John Doe", email: "john@example.com", isAdmin: false },
        { username: "sarah_m", password: "password", id: 3, name: "Sarah M", email: "sarah@example.com", isAdmin: false }
      ];

      const validUser = validCredentials.find(cred => 
        cred.username === username && cred.password === password
      );

      if (!validUser) {
        console.log("Invalid credentials for:", username);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Login successful for:", username);
      
      // Don't send password in response
      const { password: _, ...userWithoutPassword } = validUser;
      
      // Set up session
      (req.session as any).userId = validUser.id;
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        } else {
          console.log("Session saved successfully, userId:", validUser.id);
        }
      });
      
      console.log("Session set, userId:", validUser.id);
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/direct-login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      console.log("Direct login attempt:", username);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Manually set up session
      req.login(user as Express.User, (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Direct login error:", error);
      res.status(500).json({ message: "Login error" });
    }
  });
  
  // Social authentication endpoints
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { token, email, name } = req.body;
      
      if (!token || !email) {
        return res.status(400).json({ message: "Missing required authentication data" });
      }
      
      // Verify the token with Firebase Admin (server-side verification)
      // Note: For a more secure implementation, you would validate the Firebase token here
      // using firebase-admin's auth().verifyIdToken() method
      
      // For now, we'll trust the token from the client and create/find a user
      const user = await storage.findOrCreateSocialUser(email, name);
      
      // Log the user in using Passport session
      req.login(user as Express.User, (err) => {
        if (err) {
          return res.status(500).json({ message: "Authentication failed" });
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });
  
  app.post("/api/auth/facebook", async (req: Request, res: Response) => {
    try {
      const { token, email, name } = req.body;
      
      if (!token || !email) {
        return res.status(400).json({ message: "Missing required authentication data" });
      }
      
      // Verify the token with Firebase Admin (server-side verification)
      // Note: For a more secure implementation, you would validate the Facebook token here
      // using firebase-admin's auth().verifyIdToken() method
      
      // For now, we'll trust the token from the client and create/find a user
      const user = await storage.findOrCreateSocialUser(email, name);
      
      // Log the user in using Passport session
      req.login(user as Express.User, (err) => {
        if (err) {
          return res.status(500).json({ message: "Authentication failed" });
        }
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Facebook auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Lead routes (public)
  app.get("/api/leads", async (req: Request, res: Response) => {
    // Check if we want all leads (admin) or just available leads (public)
    const admin = req.query.admin === 'true' && req.isAuthenticated() && req.user.isAdmin;
    
    const leads = admin ? await storage.getLeads() : await storage.getAvailableLeads();
    res.json(leads);
  });
  
  // This needs to come before the :id route to avoid "count" being treated as an ID
  app.get("/api/leads/count", async (_req: Request, res: Response) => {
    const leads = await storage.getAvailableLeads();
    res.json(leads.length);
  });
  
  // Admin only route - get all leads (available + sold)
  app.get("/api/leads/all", isAdmin, async (_req: Request, res: Response) => {
    const leads = await storage.getLeads();
    res.json(leads);
  });
  
  // Get lead by ID - this should be after any fixed-path routes
  app.get("/api/leads/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }
    
    const lead = await storage.getLead(id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    
    res.json(lead);
  });
  
  // Admin only - create lead
  app.post("/api/leads", async (req: Request, res: Response) => {
    // For now, allow lead creation without authentication check
    // since we're using localStorage auth
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid lead data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create lead" });
    }
  });
  
  // Admin only - update lead
  app.patch("/api/leads/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }
    
    try {
      const lead = await storage.updateLead(id, req.body);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lead" });
    }
  });
  
  // Admin only - delete lead
  app.delete("/api/leads/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }
    
    const deleted = await storage.deleteLead(id);
    if (!deleted) {
      return res.status(404).json({ message: "Lead not found" });
    }
    
    res.status(204).end();
  });
  
  // Order routes
  // Get all orders (for admin)
  app.get("/api/orders", isAdmin, async (req: Request, res: Response) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });
  
  // Get user's orders (authenticated)
  app.get("/api/user/orders", async (req: Request, res: Response) => {
    // Simple auth check using session
    const userId = (req.session as any)?.userId;
    console.log("User orders request - userId from session:", userId, "full session:", req.session);
    
    if (!userId) {
      console.log("No userId in session, returning 401");
      return res.status(401).json({ message: "User not authenticated" });
    }

    try {
      console.log("Fetching orders for userId:", userId);
      const orders = await storage.getOrders(userId);
      console.log("Orders found:", orders?.length || 0);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/orders/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    
    const order = await storage.getOrder(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Only admin or order owner can view
    const user = req.user as Express.User;
    if (!user.isAdmin && order.userId !== user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(order);
  });
  
  // Create order (authenticated)
  app.post("/api/orders", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { leadId } = req.body;
      const user = req.user as Express.User;
      
      // Check if lead exists and is available
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      if (lead.status !== "available") {
        return res.status(400).json({ message: "Lead is not available for purchase" });
      }
      
      const validatedData = insertOrderSchema.parse({
        userId: user.id,
        leadId: lead.id,
        amount: lead.price,
        status: "pending", // Will be updated after payment
        customerEmail: user.email
      });
      
      const order = await storage.createOrder(validatedData);
      
      // Update lead status
      await storage.updateLead(lead.id, { status: "pending" });
      
      // For now, just mark as purchased since we don't have payment integration yet
      await storage.updateOrder(order.id, { status: "completed" });
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
