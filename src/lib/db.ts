// src/lib/db.ts
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Minimal helper – no generics, nice and simple
export function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
