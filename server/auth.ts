import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { InsertUser, User } from "@shared/schema";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function registerStudent(userData: {
  username: string;
  password: string;
  phone: string;
  regNumber: string;
  departmentName: string;
}): Promise<User> {
  const existingUser = await storage.getUserByUsername(userData.username);
  if (existingUser) {
    throw new Error("Username already exists");
  }

  const hashedPassword = await hashPassword(userData.password);
  
  const insertData: InsertUser = {
    username: userData.username,
    password: hashedPassword,
    phone: userData.phone,
    regNumber: userData.regNumber,
    role: "student",
    departmentName: userData.departmentName
  };

  const user = await storage.createUser(insertData);
  
  await storage.createActivityLog({
    userId: user.id,
    action: "USER_REGISTERED",
    details: { username: user.username, role: user.role }
  });

  return user;
}

export async function loginUser(username: string, password: string): Promise<User> {
  const user = await storage.getUserByUsername(username);
  if (!user) {
    throw new Error("Invalid username or password");
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error("Invalid username or password");
  }

  await storage.createActivityLog({
    userId: user.id,
    action: "USER_LOGIN",
    details: { username: user.username }
  });

  return user;
}

export function isAuthorized(user: User | undefined, requiredRoles: string[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

export function canAccessDepartment(user: User | undefined, departmentName: string): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "faculty-governor") return true;
  return user.departmentName === departmentName;
}
