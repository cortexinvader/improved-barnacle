import { db } from "./db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import type {
  User,
  InsertUser,
  Department,
  InsertDepartment,
  Room,
  InsertRoom,
  Message,
  InsertMessage,
  Notification,
  InsertNotification,
  Document,
  InsertDocument,
  ActivityLog,
  InsertActivityLog,
  PushSubscription,
  InsertPushSubscription,
} from "@shared/schema";
import * as schema from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Departments
  getDepartment(id: string): Promise<Department | undefined>;
  getDepartmentByName(name: string): Promise<Department | undefined>;
  getAllDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;

  // Rooms
  getRoom(id: string): Promise<Room | undefined>;
  getAllRooms(): Promise<Room[]>;
  getRoomsByDepartment(departmentName: string): Promise<Room[]>;
  createRoom(room: InsertRoom): Promise<Room>;
  deleteRoom(id: string): Promise<void>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByRoom(roomId: string, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<void>;
  getExpiredImages(): Promise<Message[]>;

  // Notifications
  getNotification(id: string): Promise<Notification | undefined>;
  getAllNotifications(): Promise<Notification[]>;
  getNotificationsByDepartment(departmentName: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<void>;

  // Documents
  getDocument(id: string): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByDepartment(departmentName: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  getExpiredDocuments(): Promise<Document[]>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;

  // Push Subscriptions
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(schema.users).orderBy(schema.users.createdAt);
    return allUsers;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(schema.users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }

  // Departments
  async getDepartment(id: string): Promise<Department | undefined> {
    const [dept] = await db.select().from(schema.departments).where(eq(schema.departments.id, id)).limit(1);
    return dept;
  }

  async getDepartmentByName(name: string): Promise<Department | undefined> {
    const [dept] = await db.select().from(schema.departments).where(eq(schema.departments.name, name)).limit(1);
    return dept;
  }

  async getAllDepartments(): Promise<Department[]> {
    return await db.select().from(schema.departments);
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDept] = await db.insert(schema.departments).values(department).returning();
    return newDept;
  }

  // Rooms
  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, id)).limit(1);
    return room;
  }

  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(schema.rooms).orderBy(schema.rooms.createdAt);
  }

  async getRoomsByDepartment(departmentName: string): Promise<Room[]> {
    return await db.select().from(schema.rooms).where(
      or(
        eq(schema.rooms.type, 'general'),
        eq(schema.rooms.departmentName, departmentName)
      )
    );
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(schema.rooms).values(room).returning();
    return newRoom;
  }

  async deleteRoom(id: string): Promise<void> {
    await db.delete(schema.rooms).where(eq(schema.rooms.id, id));
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(schema.messages).where(eq(schema.messages.id, id)).limit(1);
    return message;
  }

  async getMessagesByRoom(roomId: string, limit: number = 100): Promise<Message[]> {
    return await db.select().from(schema.messages)
      .where(eq(schema.messages.roomId, roomId))
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(schema.messages).values(message).returning();
    return newMessage;
  }

  async updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message | undefined> {
    const [updated] = await db.update(schema.messages).set(data).where(eq(schema.messages.id, id)).returning();
    return updated;
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(schema.messages).where(eq(schema.messages.id, id));
  }

  async getExpiredImages(): Promise<Message[]> {
    return await db.select().from(schema.messages).where(
      and(
        sql`${schema.messages.imageUrl} IS NOT NULL`,
        sql`${schema.messages.imageExpiry} < CURRENT_TIMESTAMP`
      )
    );
  }

  // Notifications
  async getNotification(id: string): Promise<Notification | undefined> {
    const [notif] = await db.select().from(schema.notifications).where(eq(schema.notifications.id, id)).limit(1);
    return notif;
  }

  async getAllNotifications(): Promise<Notification[]> {
    return await db.select().from(schema.notifications).orderBy(desc(schema.notifications.createdAt));
  }

  async getNotificationsByDepartment(departmentName: string): Promise<Notification[]> {
    return await db.select().from(schema.notifications).where(
      or(
        eq(schema.notifications.type, 'general'),
        eq(schema.notifications.targetDepartmentName, departmentName)
      )
    ).orderBy(desc(schema.notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotif] = await db.insert(schema.notifications).values(notification).returning();
    return newNotif;
  }

  async updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined> {
    const [updated] = await db.update(schema.notifications).set(data).where(eq(schema.notifications.id, id)).returning();
    return updated;
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(schema.notifications).where(eq(schema.notifications.id, id));
  }

  // Documents
  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(schema.documents).where(eq(schema.documents.id, id)).limit(1);
    return doc;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(schema.documents).orderBy(desc(schema.documents.createdAt));
  }

  async getDocumentsByDepartment(departmentName: string): Promise<Document[]> {
    return await db.select().from(schema.documents).where(eq(schema.documents.departmentName, departmentName))
      .orderBy(desc(schema.documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(schema.documents).values(document).returning();
    return newDoc;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(schema.documents).where(eq(schema.documents.id, id));
  }

  async getExpiredDocuments(): Promise<Document[]> {
    return await db.select().from(schema.documents).where(
      and(
        sql`${schema.documents.expiration} IS NOT NULL`,
        sql`${schema.documents.expiration} < CURRENT_TIMESTAMP`
      )
    );
  }

  // Activity Logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(schema.activityLogs).values(log).returning();
    return newLog;
  }

  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    return await db.select().from(schema.activityLogs)
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(limit);
  }

  // Push Subscriptions
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [newSub] = await db.insert(schema.pushSubscriptions).values(subscription).returning();
    return newSub;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
  }
}

export const storage = new DbStorage();