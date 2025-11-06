import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configure pool with optional SSL controlled by DB_SSL.
// - Set DB_SSL=true when your Postgres requires TLS (external DBs like Neon/Supabase often require this).
// - Optionally set DB_SSL_REJECT_UNAUTHORIZED=false if you must skip cert verification (not recommended for production).
const poolOptions: any = {
  connectionString: process.env.DATABASE_URL,
};

const shouldUseSsl = process.env.DB_SSL === "true";

if (shouldUseSsl) {
  poolOptions.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

export const pool = new Pool(poolOptions);
export const db = drizzle(pool, { schema });
