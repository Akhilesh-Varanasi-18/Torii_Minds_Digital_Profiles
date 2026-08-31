import { MongoClient, type Db, type Collection } from "mongodb";
import type { Portfolio } from "@/types/portfolio";

const dbName = process.env.MONGODB_DB || "torii_portfolio";

declare global {
  // eslint-disable-next-line no-var
  var _toriiMongoClientPromise: Promise<MongoClient> | undefined;
}

// Prod: cache the connection at module scope (module is loaded once).
let clientPromise: Promise<MongoClient> | undefined;

// Connect lazily so merely IMPORTING this module never requires MONGODB_URI.
// The URI is only needed when a request actually hits the DB — not at build
// time (the Docker image builds without .env.local; env is injected at runtime).
function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local (or the host's environment variables).");
  }
  // Reuse the client across hot-reloads in dev (Next.js re-imports modules).
  if (process.env.NODE_ENV === "development") {
    if (!global._toriiMongoClientPromise) {
      global._toriiMongoClientPromise = new MongoClient(uri).connect();
    }
    return global._toriiMongoClientPromise;
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
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
