import { MongoClient, type Db, type Collection } from "mongodb";
import type { Portfolio } from "@/types/portfolio";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "torii_portfolio";

if (!uri) {
  throw new Error("MONGODB_URI is not set. Add it to .env.local");
}

// Reuse the client across hot-reloads in dev (Next.js re-imports modules).
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _toriiMongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._toriiMongoClientPromise) {
    global._toriiMongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._toriiMongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function portfolios(): Promise<Collection<Portfolio>> {
  const db = await getDb();
  const col = db.collection<Portfolio>("portfolios");
  // Unique index on employeeCode (idempotent — safe to call repeatedly).
  await col.createIndex({ employeeCode: 1 }, { unique: true });
  return col;
}

export interface EmpCode {
  code: string;
  addedAt: string;
}

export async function empCodes(): Promise<Collection<EmpCode>> {
  const db = await getDb();
  const col = db.collection<EmpCode>("emp_codes");
  await col.createIndex({ code: 1 }, { unique: true });
  return col;
}
