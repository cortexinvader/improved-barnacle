import { storage } from "./storage";
import { db } from "./db";
import * as schema from "@shared/schema";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";

interface Config {
  facultyGovernor: {
    username: string;
    password: string;
    department: string;
    phone?: string; // Added phone
  };
  departmentGovernors: Array<{
    username: string;
    password: string;
    department: string;
    phone?: string; // Added phone
  }>;
  admin: {
    username: string;
    password: string;
    phone?: string; // Added phone
  };
  departments: string[];
  aiApi: {
    endpoint: string;
    key: string;
  };
  developer: {
    name: string;
    contact: string;
  };
  system: {
    imageExpiryHours: number;
    maxUploadSizeMB: number;
    sessionTimeoutMinutes: number;
  };
}

interface BackupData {
  backupCreated: boolean;
  timestamp?: string;
  users: Array<{
    username: string;
    password?: string; // Password might be hashed or not depending on backup source
    phone?: string;
    regNumber?: string;
    role: string;
    departmentName?: string;
  }>;
  notifications?: Array<{
    id: string;
    type: string;
    notificationType: string;
    title: string;
    content: string;
    postedBy: string;
    targetDepartmentName?: string | null;
    reactions: any;
    comments: any[];
    createdAt: string;
  }>;
}

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Run database migrations automatically
function runMigrations() {
  try {
    console.log("🔄 Running database migrations...");
    // NOTE: This assumes you have a script in your package.json like:
    // "db:push": "drizzle-kit push:pg" or similar for your database.
    // If your command is different, please update it here.
    const { execSync } = require("child_process");
    execSync("npm run db:push", { stdio: "inherit" });
    console.log("✅ Database migrations completed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error; // Re-throw to stop initialization if migrations fail
  }
}

export async function initializeSystem() {
  console.log("🚀 Initializing CIE Faculty Portal...");

  try {
    // Run migrations first to ensure all tables exist
    runMigrations();

    const configPath = path.join(process.cwd(), "config.json");
    const configData = await fs.readFile(configPath, "utf-8");
    const config: Config = JSON.parse(configData);

    await initializeDepartments(config.departments);
    await initializeDefaultRooms(config.departments);
    await restoreUsersFromBackup();
    await restoreNotificationsFromBackup();
    await initializeGovernors(config);
    await syncConfigUsersToBackup(config);

    console.log("✅ System initialization complete");
  } catch (error) {
    console.error("❌ Initialization error:", error);
  }
}

async function initializeDepartments(departments: string[]) {
  console.log("📚 Initializing departments...");

  for (const deptName of departments) {
    const existing = await storage.getDepartmentByName(deptName);
    if (!existing) {
      await storage.createDepartment({ name: deptName });
      console.log(`  ✓ Created department: ${deptName}`);
    }
  }
}

async function initializeDefaultRooms(departments: string[]) {
  console.log("💬 Initializing default chat rooms...");

  const rooms = await storage.getAllRooms();

  const generalExists = rooms.some(r => r.name === "General" && r.type === "general");
  if (!generalExists) {
    await storage.createRoom({
      name: "General",
      type: "general",
      departmentName: null,
      createdBy: "system"
    });
    console.log("  ✓ Created General chat room");
  }

  for (const deptName of departments) {
    const deptRoomExists = rooms.some(
      r => r.name === deptName && r.type === "department"
    );
    if (!deptRoomExists) {
      await storage.createRoom({
        name: deptName,
        type: "department",
        departmentName: deptName,
        createdBy: "system"
      });
      console.log(`  ✓ Created ${deptName} chat room`);
    }
  }
}

async function restoreUsersFromBackup() {
  console.log("🔄 Restoring users from backup...");

  try {
    let backupData: string;

    // Priority 1: Check for ADMIN_BACKUP env variable (for Render)
    if (process.env.ADMIN_BACKUP) {
      console.log("  ℹ Using backup from ADMIN_BACKUP environment variable");
      backupData = process.env.ADMIN_BACKUP;
    } else {
      // Priority 2: Use backup file from filesystem
      const backupPath = path.join(process.cwd(), "data", "admin_backup.json");
      backupData = await fs.readFile(backupPath, "utf-8");
    }

    const backup: BackupData = JSON.parse(backupData);

    if (!backup.backupCreated || !Array.isArray(backup.users) || backup.users.length === 0) {
      console.log("  ℹ No backup to restore");
      return;
    }

    // helper to detect bcrypt hashes (e.g. $2b$10$...)
    const isBcryptHash = (s?: string) => {
      if (!s) return false;
      return /^\$2[aby]\$\d{2}\$/.test(s);
    };

    let restoredCount = 0;
    for (const userData of backup.users) {
      const existing = await storage.getUserByUsername(userData.username);
      if (!existing) {
        // Skip users without required fields (password)
        if (!userData.password) {
          console.log(`  ⚠ Skipping user ${userData.username} - no password in backup`);
          continue;
        }

        // If the backup already contains a bcrypt hash (starts with $2...), store it as-is.
        // If the backup password is plaintext, hash it now.
        const passwordToStore: string = isBcryptHash(userData.password)
          ? userData.password
          : await hashPassword(userData.password);

        await storage.createUser({
          username: userData.username,
          password: passwordToStore,
          phone: userData.phone || "+20 000 000 0000",
          regNumber: userData.regNumber || null,
          role: userData.role as any,
          departmentName: userData.departmentName || "Unknown"
        });
        restoredCount++;
      }
    }

    console.log(`  ✓ Restored ${restoredCount} users from backup`);
  } catch (error) {
    console.log("  ℹ No backup file found or error reading backup, continuing without restoring users.");
  }
}

async function restoreNotificationsFromBackup() {
  console.log("🔄 Restoring notifications from backup...");

  try {
    let backupData: string;

    // Priority 1: Check for ADMIN_BACKUP env variable (for Render)
    if (process.env.ADMIN_BACKUP) {
      backupData = process.env.ADMIN_BACKUP;
    } else {
      // Priority 2: Use backup file from filesystem
      const backupPath = path.join(process.cwd(), "data", "admin_backup.json");
      backupData = await fs.readFile(backupPath, "utf-8");
    }

    const backup: BackupData = JSON.parse(backupData);

    console.log(`  📋 Found backup with ${backup.notifications?.length || 0} notifications`);

    if (!backup.backupCreated || !Array.isArray(backup.notifications) || backup.notifications.length === 0) {
      console.log("  ℹ No notifications to restore");
      return;
    }

    let restoredCount = 0;
    let skippedCount = 0;
    for (const notifData of backup.notifications) {
      try {
        // Check if notification already exists by ID
        const existing = await storage.getNotification(notifData.id);
        if (!existing) {
          // Insert directly into database with the backup ID preserved
          await db.insert(schema.notifications).values({
            id: notifData.id,
            type: notifData.type,
            notificationType: notifData.notificationType,
            title: notifData.title,
            content: notifData.content,
            postedBy: notifData.postedBy,
            targetDepartmentName: notifData.targetDepartmentName || null,
            reactions: notifData.reactions || {},
            comments: notifData.comments || [],
            createdAt: new Date(notifData.createdAt),
          });
          restoredCount++;
          console.log(`  ✓ Restored notification: ${notifData.title}`);
        } else {
          skippedCount++;
          console.log(`  ⊘ Skipped existing notification: ${notifData.title}`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to restore notification ${notifData.id}:`, error);
      }
    }

    console.log(`  ✓ Restored ${restoredCount} notifications from backup (${skippedCount} already existed)`);
  } catch (error) {
    console.error("  ✗ Error restoring notifications:", error);
    console.log("  ℹ Continuing without restoring notifications.");
  }
}

async function initializeGovernors(config: Config) {
  console.log("👥 Initializing governors and admin...");

  const facultyGov = await storage.getUserByUsername(config.facultyGovernor.username);
  if (!facultyGov) {
    await storage.createUser({
      username: config.facultyGovernor.username,
      password: await hashPassword(config.facultyGovernor.password),
      phone: config.facultyGovernor.phone || "+20 000 000 0000", // Use phone from config or default
      role: "faculty-governor",
      departmentName: "All Departments", // Assuming faculty governor oversees all departments
    });
    console.log(`  ✓ Created Faculty Governor: ${config.facultyGovernor.username}`);
  }

  for (const gov of config.departmentGovernors) {
    const existingGov = await storage.getUserByUsername(gov.username);
    if (!existingGov) {
      await storage.createUser({
        username: gov.username,
        password: await hashPassword(gov.password),
        phone: gov.phone || "+20 000 000 0000", // Use phone from config or default
        role: "department-governor",
        departmentName: gov.department,
      });
      console.log(`  ✓ Created Department Governor: ${gov.username} (${gov.department})`);
    }
  }

  const admin = await storage.getUserByUsername(config.admin.username);
  if (!admin) {
    await storage.createUser({
      username: config.admin.username,
      password: await hashPassword(config.admin.password),
      phone: config.admin.phone || "+20 000 000 0000", // Use phone from config or default
      role: "admin",
      departmentName: "All Departments", // Admin has access to all departments
    });
    console.log(`  ✓ Created Admin: ${config.admin.username}`);
  }
}

async function syncConfigUsersToBackup(config: Config) {
  console.log("🔄 Syncing config.json users to backup...");

  try {
    const backupPath = path.join(process.cwd(), "data", "admin_backup.json");
    let backup: BackupData;

    try {
      const backupData = await fs.readFile(backupPath, "utf-8");
      backup = JSON.parse(backupData);
    } catch {
      backup = { backupCreated: true, users: [] };
    }

    const configUsernames = new Set<string>();

    // Add faculty governor
    configUsernames.add(config.facultyGovernor.username);
    const facultyGov = await storage.getUserByUsername(config.facultyGovernor.username);
    if (facultyGov) {
      const existingIndex = backup.users.findIndex(u => u.username === facultyGov.username);
      const userData = {
        username: facultyGov.username,
        password: facultyGov.password,
        phone: facultyGov.phone || "+20 000 000 0000",
        role: facultyGov.role,
        departmentName: facultyGov.departmentName
      };
      if (existingIndex >= 0) {
        backup.users[existingIndex] = userData;
      } else {
        backup.users.push(userData);
      }
    }

    // Add department governors
    for (const gov of config.departmentGovernors) {
      configUsernames.add(gov.username);
      const departmentGov = await storage.getUserByUsername(gov.username);
      if (departmentGov) {
        const existingIndex = backup.users.findIndex(u => u.username === departmentGov.username);
        const userData = {
          username: departmentGov.username,
          password: departmentGov.password,
          phone: departmentGov.phone || "+20 000 000 0000",
          role: departmentGov.role,
          departmentName: departmentGov.departmentName
        };
        if (existingIndex >= 0) {
          backup.users[existingIndex] = userData;
        } else {
          backup.users.push(userData);
        }
      }
    }

    // Add admin
    configUsernames.add(config.admin.username);
    const admin = await storage.getUserByUsername(config.admin.username);
    if (admin) {
      const existingIndex = backup.users.findIndex(u => u.username === admin.username);
      const userData = {
        username: admin.username,
        password: admin.password,
        phone: admin.phone || "+20 000 000 0000",
        role: admin.role,
        departmentName: admin.departmentName
      };
      if (existingIndex >= 0) {
        backup.users[existingIndex] = userData;
      } else {
        backup.users.push(userData);
      }
    }

    // Ensure backup timestamp is updated
    const finalBackup = {
      ...backup,
      backupCreated: true,
      timestamp: new Date().toISOString()
    };

    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(finalBackup, null, 2));
    console.log(`  ✓ Synced ${configUsernames.size} config users to backup`);
  } catch (error) {
    console.error("  ✗ Error syncing config users to backup:", error);
  }
}

// Placeholder for future implementation based on user's request:
// - User profile viewing: Need to implement authorization checks in profile fetching logic.
// - Image uploads with expiry: Will require a separate service or scheduled task to clean up expired images.
// - Documents viewable by everyone: Adjusting permissions for document access.
// - Admin panel to show all users: Modify admin fetching logic to retrieve all users.
// - Credentials download: Implement functionality to generate and download a credentials file.