import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Extend the Express Request type to include user
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
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "your-session-secret", // In production, use environment variable
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Login attempt for username:", username);
        const user = await storage.getUserByUsername(username);
        console.log("User found:", user ? `Yes (id: ${user.id}, isAdmin: ${user.isAdmin})` : "No");
        
        if (!user) {
          console.log("User not found");
          return done(null, false);
        }
        
        // Temporary: Check for plain text password for admin account
        const passwordValid = user.password === password || await comparePasswords(password, user.password);
        console.log("Password valid:", passwordValid);
        
        if (!passwordValid) {
          console.log("Invalid password");
          return done(null, false);
        }
        
        console.log("Authentication successful");
        // Cast to Express.User to ensure type compatibility
        return done(null, user as Express.User);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        // Cast to Express.User to ensure type compatibility
        done(null, user as Express.User);
      } else {
        done(null, false);
      }
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, name } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      
      // Check if this is the first user (who should be admin)
      const isFirstUser = (await db.select().from(users).limit(1)).length === 0;
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        name,
        isAdmin: isFirstUser // First user is admin by default
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      req.login(user as Express.User, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login endpoint hit with body:", req.body);
    passport.authenticate("local", (err, user, info) => {
      console.log("Passport authenticate result:", { err, user: user ? 'User found' : 'No user', info });
      
      if (err) {
        console.error("Passport authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed - no user returned");
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return next(loginErr);
        }
        
        console.log("Login successful for user:", user.username);
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Simple test login endpoint
  app.post("/api/test-login", async (req, res) => {
    console.log("Test login hit with:", req.body);
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (user && user.password === password) {
        req.login(user as Express.User, (err) => {
          if (err) {
            console.error("Login session error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          console.log("Login successful, returning user data");
          const { password: _, ...userWithoutPassword } = user;
          res.status(200).json(userWithoutPassword);
        });
      } else {
        console.log("Invalid credentials provided");
        return res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ message: "Login error" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = req.user as Express.User;
    res.json(userWithoutPassword);
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "User not authenticated" });
}

// Middleware to check if user is admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as Express.User).isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Requires admin access" });
}

// Import db for first user check
import { db, users } from "./db";