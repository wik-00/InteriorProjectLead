import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  
  // Debug login requests
  if (path === '/api/login' && req.method === 'POST') {
    console.log('Login request received:', req.body);
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Add a middleware to check if request is for API before Vite handles it
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      // This is an API request, let it through to our routes
      return next();
    }
    next();
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Serve static website files instead of React app
  
  // Serve static files from root directory (website assets)
  app.use('/assets', express.static(path.join(process.cwd(), 'assets')));
  
  // Serve HTML pages
  app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
  });
  
  app.get('/leads', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'leads.html'));
  });
  
  app.get('/login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'login.html'));
  });
  
  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dashboard.html'));
  });
  
  app.get('/about', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'about.html'));
  });
  
  app.get('/contact', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'contact.html'));
  });
  
  // Catch-all route for SPA behavior
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(process.cwd(), 'index.html'));
    }
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
