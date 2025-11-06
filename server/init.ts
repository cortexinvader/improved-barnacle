import { storage } from "./storage";
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
  users: Array<{
    username: string;
    password?: string; // Password might be hashed or not depending on backup source
    phone?: string;
    regNumber?: string;
    role: string;
    departmentName: string;
  }>;
}

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function initializeSystem() {
  console.log("🚀 Initializing CIE Faculty Portal...");

  try {
    const configPath = path.join(process.cwd(), "config.json");
    const configData = await fs.readFile(configPath, "utf-8");
    const config: Config = JSON.parse(configData);

    await initializeDepartments(config.departments);
    await initializeDefaultRooms(config.departments);
    await restoreUsersFromBackup();
    await initializeGovernors(config);

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
    const backupPath = path.join(process.cwd(), "data", "admin_backup.json");
    const backupData = await fs.readFile(backupPath, "utf-8");
    const backup: BackupData = JSON.parse(backupData);

    if (!backup.backupCreated || backup.users.length === 0) {
      console.log("  ℹ No backup to restore");
      return;
    }

    let restoredCount = 0;
    for (const userData of backup.users) {
      const existing = await storage.getUserByUsername(userData.username);
      if (!existing) {
        // Ensure password is hashed if it's not already (assuming backup might store plain text for simplicity or hashed)
        const passwordToStore = userData.password ? await hashPassword(userData.password) : undefined;
        await storage.createUser({
          ...userData,
          password: passwordToStore,
          phone: userData.phone || null, // Ensure phone is handled
          regNumber: userData.regNumber || null,
          departmentName: userData.departmentName || "Unknown"
        });
        restoredCount++;
      }
    }

    console.log(`  ✓ Restored ${restoredCount} users from backup`);
  } catch (error) {
    console.log("  ℹ No backup file found or error reading backup, continuing without restoring users.");
    // This is not a critical error, so we can just log and continue.
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

// Placeholder for future implementation based on user's request:
// - User profile viewing: Need to implement authorization checks in profile fetching logic.
// - Image uploads with expiry: Will require a separate service or scheduled task to clean up expired images.
// - Documents viewable by everyone: Adjusting permissions for document access.
// - Admin panel to show all users: Modify admin fetching logic to retrieve all users.
// - Credentials download: Implement functionality to generate and download a credentials file.