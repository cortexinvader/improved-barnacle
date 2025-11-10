import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type WebSocket as WSWebSocket, WebSocket } from "ws";
import session from "express-session";
import memorystore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { db } from "./db";
import { users, notifications, rooms, messages, pushSubscriptions } from "../shared/schema";
import { eq, desc, and, or, inArray, sql, not } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./auth";
import multer from "multer";
import { sendBackupToTelegram } from "./telegram";
import { sendPushNotification } from './webpush';
import path from 'path';
import pg from 'pg';

import { storage } from "./storage";
import { registerStudent, loginUser, isAuthorized, canAccessDepartment } from "./auth";
import { initializeSystem } from "./init";
import { logger } from "./logger";
import fs from "fs/promises";
import cron from "node-cron";
import type { User } from "@shared/schema";
import { registerAIRoutes } from "./ai";

declare module "express-session" {
  interface SessionData {
    user?: User;
    userId?: string; // Added for better session management
  }
}

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
});

interface WebSocketClient extends WSWebSocket {
  userId?: string;
  roomId?: string;
}

// Store all connected WebSocket clients for broadcasting
const allClients = new Set<WebSocketClient>();

// Shared helper function to generate admin backup
async function generateAdminBackup(): Promise<{ backupPath: string; backupData: any }> {
  const users = await storage.getAllUsers();
  const notifications = await storage.getAllNotifications();

  const backupData = {
    backupCreated: true,
    timestamp: new Date().toISOString(),
    users: users.map(u => ({
      username: u.username,
      password: u.password,
      phone: u.phone,
      regNumber: u.regNumber || undefined,
      role: u.role,
      departmentName: u.departmentName,
    })),
    notifications: notifications.map(n => ({
      id: n.id,
      type: n.type,
      notificationType: n.notificationType,
      title: n.title,
      content: n.content,
      postedBy: n.postedBy,
      targetDepartmentName: n.targetDepartmentName,
      reactions: n.reactions,
      comments: n.comments,
      createdAt: n.createdAt,
    })),
  };

  const backupPath = path.join(process.cwd(), "data", "admin_backup.json");
  await fs.writeFile(backupPath, JSON.JSON.stringify(backupData, null, 2));

  return { backupPath, backupData };
}

export async function registerRoutes(app: Express): Promise<Server> {
  await initializeSystem();

  const configPath = path.join(process.cwd(), "config.json");
  const configData = await fs.readFile(configPath, "utf-8");
  const config = JSON.parse(configData);
  const sessionTimeoutMinutes = config.app?.session_timeout_minutes || 480;
  const sessionTimeout = sessionTimeoutMinutes * 60 * 1000;

  const MemoryStore = memorystore(session);
  const PgSession = connectPgSimple(session);

  // Use PostgreSQL session store in production if DATABASE_URL is available, otherwise use MemoryStore
  const sessionStore = process.env.DATABASE_URL
    ? new PgSession({
        pool: new pg.Pool({
          connectionString: process.env.DATABASE_URL,
        }),
        tableName: 'session',
        createTableIfMissing: true,
      })
    : new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "ciesa-faculty-portal-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: sessionTimeout,
      },
      store: sessionStore,
      proxy: true, // Trust first proxy (Render's load balancer)
    })
  );

  // Scheduled backup system - reads interval from config
  try {
    const configPath = path.join(process.cwd(), "config.json");
    const configData = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configData);
    const backupIntervalHours = config.system?.backupIntervalHours || 24;

    // Create cron expression based on interval
    let cronExpression: string;
    if (backupIntervalHours < 24) {
      // For intervals less than 24 hours, run every N hours
      cronExpression = `0 */${backupIntervalHours} * * *`;
    } else {
      // For 24 hours or more, run once per day at midnight
      cronExpression = "0 0 * * *";
    }

    cron.schedule(cronExpression, async () => {
      try {
        logger.info("Running scheduled backup...");
        console.log("🔄 Running scheduled backup...");
        const { backupPath } = await generateAdminBackup();
        await sendBackupToTelegram(backupPath);
        logger.info("Scheduled backup completed successfully");
        console.log("✓ Scheduled backup completed");
      } catch (error) {
        logger.error("Scheduled backup failed", error);
        console.error("✗ Scheduled backup failed:", error);
      }
    });

    logger.info(`Scheduled backup configured`, { intervalHours: backupIntervalHours, cronExpression });
    console.log(`✓ Scheduled backup configured (every ${backupIntervalHours} hours)`);
  } catch (error) {
    logger.error("Failed to configure scheduled backup", error);
    console.error("✗ Failed to configure scheduled backup:", error);
  }

  cron.schedule("0 * * * *", async () => {
    try {
      logger.debug("Running cleanup job for expired images and documents");
      const expiredImages = await storage.getExpiredImages();
      for (const msg of expiredImages) {
        if (msg.imageUrl) {
          try {
            await fs.unlink(msg.imageUrl);
            await storage.updateMessage(msg.id, { imageUrl: null, imageExpiry: null });
            logger.debug(`Deleted expired image`, { messageId: msg.id, imageUrl: msg.imageUrl });
          } catch (err) {
            logger.warn("Failed to delete expired image", err, { messageId: msg.id });
            console.error("Error deleting expired image:", err);
          }
        }
      }

      const expiredDocs = await storage.getExpiredDocuments();
      for (const doc of expiredDocs) {
        try {
          await fs.unlink(doc.path);
          await storage.deleteDocument(doc.id);
          logger.debug(`Deleted expired document`, { docId: doc.id, path: doc.path });
        } catch (err) {
          logger.warn("Failed to delete expired document", err, { docId: doc.id });
          console.error("Error deleting expired document:", err);
        }
      }
      logger.debug("Cleanup job completed", { expiredImages: expiredImages.length, expiredDocs: expiredDocs.length });
    } catch (error) {
      logger.error("Cleanup job failed", error);
      console.error("Cleanup job error:", error);
    }
  });

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { username, password, phone, regNumber, departmentName } = req.body;

      if (!username || !password || !phone || !regNumber || !departmentName) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const user = await registerStudent({
        username,
        password,
        phone,
        regNumber,
        departmentName,
      });

      const { password: _, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword as User;
      req.session.userId = user.id; // Store userId in session

      // Update local backup file immediately (without sending to Telegram)
      try {
        await generateAdminBackup();
        console.log("✓ Local backup updated after signup");
      } catch (error) {
        console.error("✗ Local backup update failed after signup:", error);
      }

      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const user = await loginUser(username, password);
      const { password: _, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword as User;
      req.session.userId = user.id; // Store userId in session

      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  // Development-only: Auto-login endpoint
  app.post("/api/auth/auto-login", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword as User;
      req.session.userId = user.id;

      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({ user: req.session.user });
  });

  app.patch("/api/auth/tutorial", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const updatedUser = await storage.updateUser(req.session.user.id, {
        tutorialSeen: true
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      req.session.user = userWithoutPassword as User;

      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/config", async (req: Request, res: Response) => {
    try {
      const configData = await fs.readFile("config.json", "utf-8");
      const config = JSON.parse(configData);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to load config" });
    }
  });

  app.get("/api/departments", async (req: Request, res: Response) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/rooms", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.session.user;
      let rooms;
      if (user.role === "admin" || user.role === "faculty-governor") {
        // Admin and faculty governors see all rooms
        rooms = await storage.getAllRooms();
      } else {
        // Students and department governors see general rooms + their department rooms
        const allRooms = await storage.getAllRooms();
        rooms = allRooms.filter(room =>
          room.type === "general" ||
          room.departmentName === user.departmentName ||
          room.departmentName === null
        );
      }

      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rooms", async (req: Request, res: Response) => {
    try {
      if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create rooms" });
      }

      const { name, type, departmentName } = req.body;
      const room = await storage.createRoom({
        name,
        type: type || "custom",
        departmentName: departmentName || null,
        createdBy: req.session.user.id,
      });

      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "ROOM_CREATED",
        details: { roomId: room.id, roomName: name },
      });

      // Broadcast new room to all connected clients
      allClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "new_room",
            room: room,
          }));
        }
      });

      res.json(room);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/rooms/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can delete rooms" });
      }

      const room = await storage.getRoom(req.params.id);
      if (room && (room.type === "general" || room.type === "department")) {
        return res.status(400).json({ error: "Cannot delete default rooms" });
      }

      await storage.deleteRoom(req.params.id);
      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "ROOM_DELETED",
        details: { roomId: req.params.id },
      });

      res.json({ message: "Room deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Push notification endpoints
  app.get("/api/push/vapid-public-key", async (req: Request, res: Response) => {
    const { getVapidPublicKey } = await import('./webpush');
    const publicKey = getVapidPublicKey();

    if (!publicKey) {
      return res.status(404).json({ error: "Push notifications not configured" });
    }

    res.json({ publicKey });
  });

  app.post("/api/push/subscribe", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { endpoint, keys } = req.body;

      await storage.createPushSubscription({
        userId: req.session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Push subscription error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.session.user;
      const allNotifications = await storage.getAllNotifications();

      const visibleNotifications = allNotifications.filter(notification => {
        if (notification.targetDepartmentName === null) {
          return true;
        }

        if (user.role === "admin" || user.role === "faculty-governor") {
          return true;
        }

        return notification.targetDepartmentName === user.departmentName;
      });

      res.json(visibleNotifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const allowedRoles = ["faculty-governor", "department-governor", "admin"];
      if (!allowedRoles.includes(req.session.user.role)) {
        return res.status(403).json({ error: "Not authorized to post notifications" });
      }

      const { title, content, notificationType, targetDepartmentName } = req.body;

      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Notification content is required" });
      }

      let type = "general";
      let target = null;

      if (req.session.user.role === "department-governor") {
        if (targetDepartmentName === null || targetDepartmentName === undefined) {
          type = "general";
          target = null;
        } else {
          type = "department";
          target = req.session.user.departmentName;
        }
      } else if (targetDepartmentName && targetDepartmentName !== "") {
        type = "department";
        target = targetDepartmentName;
      }

      const notification = await storage.createNotification({
        type,
        notificationType: notificationType || "regular",
        title: title || "Notification",
        content: content.trim(),
        postedBy: req.session.user.username,
        targetDepartmentName: target,
        reactions: {},
        comments: [],
      });

      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "NOTIFICATION_POSTED",
        details: { notificationId: notification.id, type: notificationType },
      });

      // Send push notification to subscribed users if the notification is relevant to them
      const subscribedUsers = await storage.getPushSubscribersForDepartment(target);
      for (const sub of subscribedUsers) {
        const user = await storage.getUser(sub.userId);
        if (user && user.username !== req.session.user.username) { // Don't send notification to sender
          try {
            await sendPushNotification(
              user.username, // Assuming sendPushNotification can use username to fetch subscription
              notification.title,
              notification.content
            );
          } catch (pushError) {
            logger.error("Failed to send push notification", pushError, { userId: sub.userId });
          }
        }
      }

      // Update local backup file immediately (without sending to Telegram)
      try {
        await generateAdminBackup();
        console.log("✓ Local backup updated after notification creation");
      } catch (error) {
        console.error("✗ Local backup update failed after notification:", error);
      }

      res.json(notification);
    } catch (error: any) {
      console.error("Notification posting error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/notifications/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const notification = await storage.updateNotification(req.params.id, req.body);
      res.json(notification);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/:id/react", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { reactionType } = req.body;
      const notification = await storage.getNotification(req.params.id);

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      const reactions = (notification.reactions as any) || {};
      reactions[reactionType] = (reactions[reactionType] || 0) + 1;

      const updated = await storage.updateNotification(req.params.id, { reactions });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/notifications/:id/comment", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { content } = req.body;
      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const notification = await storage.getNotification(req.params.id);

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      const comments = (notification.comments as any[]) || [];
      const newComment = {
        id: Date.now().toString(),
        author: req.session.user.username,
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      comments.push(newComment);

      const updated = await storage.updateNotification(req.params.id, { comments });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/notifications/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Allow deletion by admins, faculty governors, and department governors
      const allowedRoles = ["admin", "faculty-governor", "department-governor"];
      if (!allowedRoles.includes(req.session.user.role)) {
        return res.status(403).json({ error: "Not authorized to delete notifications" });
      }

      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      // Department governors can only delete notifications they posted or for their department
      if (req.session.user.role === "department-governor") {
        const canDelete =
          notification.postedBy === req.session.user.username ||
          notification.targetDepartmentName === req.session.user.departmentName;

        if (!canDelete) {
          return res.status(403).json({ error: "You can only delete your own notifications or notifications for your department" });
        }
      }

      await storage.deleteNotification(req.params.id);

      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "NOTIFICATION_DELETED",
        details: { notificationId: req.params.id, title: notification.title },
      });

      // Update local backup file immediately (without sending to Telegram)
      try {
        await generateAdminBackup();
        console.log("✓ Local backup updated after notification deletion");
      } catch (error) {
        console.error("✗ Local backup update failed after deletion:", error);
      }

      res.json({ message: "Notification deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Original document upload endpoint - to be replaced by the new one below
  // app.post("/api/documents", upload.single("file"), async (req: any, res: Response) => {
  //   try {
  //     if (!req.session.user) {
  //       return res.status(401).json({ error: "Not authenticated" });
  //     }

  //     if (!req.file) {
  //       return res.status(400).json({ error: "No file uploaded" });
  //     }

  //     const document = await storage.createDocument({
  //       name: req.file.originalname,
  //       path: req.file.path,
  //       owner: req.session.user.username,
  //       departmentName: req.body.departmentName || req.session.user.departmentName,
  //       fileType: path.extname(req.file.originalname),
  //       size: req.file.size,
  //       expiration: req.body.expiration ? new Date(req.body.expiration) : null,
  //     });

  //     await storage.createActivityLog({
  //       userId: req.session.user.id,
  //       action: "DOCUMENT_UPLOADED",
  //       details: { documentId: document.id, fileName: req.file.originalname },
  //     });

  //     res.json(document);
  //   } catch (error: any) {
  //     res.status(500).json({ error: error.message });
  //   }
  // });

  app.delete("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.owner !== req.session.user.username && req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized" });
      }

      try {
        await fs.unlink(document.path);
      } catch (err) {
        console.error("Error deleting file:", err);
      }

      await storage.deleteDocument(req.params.id);
      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "DOCUMENT_DELETED",
        details: { documentId: req.params.id },
      });

      res.json({ message: "Document deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/backup", async (req: Request, res: Response) => {
    try {
      if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
      }

      const { backupPath, backupData } = await generateAdminBackup();

      // Ensure notifications are in the backup
      const notificationCount = backupData.notifications?.length || 0;

      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "CREDENTIALS_BACKUP",
        details: {
          userCount: backupData.users.length,
          notificationCount
        },
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=admin_backup.json');
      res.json(backupData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/telegram-backup", async (req: Request, res: Response) => {
    try {
      if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
      }

      const { backupPath, backupData } = await generateAdminBackup();

      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "TELEGRAM_BACKUP_MANUAL",
        details: {
          userCount: backupData.users.length,
          notificationCount: backupData.notifications?.length || 0
        },
      });

      // Send backup via Telegram
      await sendBackupToTelegram(backupPath);

      res.json({
        message: "Backup sent to Telegram successfully",
        userCount: backupData.users.length,
        notificationCount: backupData.notifications?.length || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/logs", async (req: Request, res: Response) => {
    try {
      if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
      }

      const logs = await storage.getActivityLogs(100);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
      }

      const users = await storage.getAllUsers();
      const usersWithoutPassword = users.map(u => ({ ...u, password: undefined }));
      res.json(usersWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Admin only" });
      }

      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.role === "admin") {
        return res.status(400).json({ error: "Cannot delete admin users" });
      }

      await storage.deleteUser(req.params.id);
      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "USER_DELETED",
        details: { deletedUserId: req.params.id, deletedUsername: user.username },
      });

      // Update local backup file immediately (without sending to Telegram)
      try {
        await generateAdminBackup();
        console.log("✓ Local backup updated after user deletion");
      } catch (error) {
        console.error("✗ Local backup update failed after user deletion:", error);
      }

      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/profile/:username", async (req: Request, res: Response) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const userWithoutPassword = { ...user, password: undefined };
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve uploaded files
  app.get("/uploads/:filename", async (req: Request, res: Response) => {
    try {
      const filePath = path.join(process.cwd(), "uploads", req.params.filename);
      res.sendFile(filePath);
    } catch (error) {
      res.status(404).json({ error: "File not found" });
    }
  });

  // Register AI routes
  registerAIRoutes(app);

  // Document upload endpoint
  app.post("/api/documents/upload", upload.single("document"), async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const document = await storage.createDocument({
        name: file.originalname,
        owner: req.session.user.username,
        departmentName: req.session.user.departmentName,
        path: file.path,
        fileType: path.extname(file.originalname),
        size: file.size,
        expiration: null,
      });

      await storage.createActivityLog({
        userId: req.session.user.id,
        action: "DOCUMENT_UPLOADED",
        details: { documentId: document.id, fileName: file.originalname },
      });

      res.json(document);
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Get documents endpoint
  app.get("/api/documents", async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  // Image upload endpoint for chat
  app.post("/api/chat/upload-image", upload.single("image"), async (req: Request, res: Response) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    try {
      const configData = await fs.readFile("config.json", "utf-8");
      const config = JSON.parse(configData);
      const expiryHours = config.system?.imageExpiryHours || 3;

      const roomId = req.body.roomId;
      const caption = req.body.caption || '';
      const imageExpiry = new Date();
      imageExpiry.setHours(imageExpiry.getHours() + expiryHours);

      const message = await storage.createMessage({
        roomId,
        sender: req.session.user.username,
        content: caption || `[Image: ${file.originalname}]`,
        imageUrl: file.path,
        imageExpiry,
        formatting: null,
        replyTo: null,
        edited: false,
        reactions: {},
      });

      // Broadcast the new message to all clients in the room
      const roomClients = rooms.get(roomId);
      if (roomClients) {
        roomClients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "new_message", message }));
          }
        });
      }

      res.json({ success: true, message });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });


  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const rooms = new Map<string, Set<WebSocketClient>>();

  wss.on("connection", (ws: WebSocketClient) => {
    console.log("WebSocket client connected");
    allClients.add(ws);

    ws.on("message", async (data: string) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "join") {
          ws.userId = message.userId;
          ws.roomId = message.roomId;

          if (!rooms.has(message.roomId)) {
            rooms.set(message.roomId, new Set());
          }
          rooms.get(message.roomId)!.add(ws);

          // Fetch messages from database to ensure persistence
          const messages = await storage.getMessagesByRoom(message.roomId, 50);
          ws.send(JSON.stringify({ type: "history", messages: messages.reverse() }));
        }

        if (message.type === "message") {
          const newMessage = await storage.createMessage({
            roomId: message.roomId,
            sender: message.sender,
            content: message.content,
            formatting: message.formatting || null,
            imageUrl: message.imageUrl || null,
            imageExpiry: message.imageExpiry || null,
            replyTo: message.replyTo || null,
            edited: false,
            reactions: {},
          });

          // Broadcast the new message to all clients in the room
          const roomClients = rooms.get(message.roomId);
          if (roomClients) {
            roomClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "new_message", message: newMessage }));
              }
            });
          }
        }

        if (message.type === "edit") {
          await storage.updateMessage(message.messageId, {
            content: message.content,
            edited: true,
          });

          const roomClients = rooms.get(ws.roomId!);
          if (roomClients) {
            roomClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "message_edited",
                  messageId: message.messageId,
                  content: message.content,
                }));
              }
            });
          }
        }

        if (message.type === "delete") {
          await storage.deleteMessage(message.messageId);

          const roomClients = rooms.get(ws.roomId!);
          if (roomClients) {
            roomClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "message_deleted",
                  messageId: message.messageId,
                }));
              }
            });
          }
        }

        if (message.type === "react") {
          const msg = await storage.getMessage(message.messageId);
          if (msg) {
            const reactions = (msg.reactions as any) || {};
            const reactionKey = message.emoji || "heart";

            reactions[reactionKey] = (reactions[reactionKey] || 0) + 1;
            await storage.updateMessage(message.messageId, { reactions });

            const roomClients = rooms.get(ws.roomId!);
            if (roomClients) {
              roomClients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: "message_reacted",
                    messageId: message.messageId,
                    reactions,
                  }));
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (ws.roomId && rooms.has(ws.roomId)) {
        rooms.get(ws.roomId)!.delete(ws);
      }
      allClients.delete(ws);
      console.log("WebSocket client disconnected");
    });
  });

  return httpServer;
}