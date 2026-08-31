import bcrypt from "bcryptjs";
import { empCodes } from "@/lib/mongodb";
import { normalizeCode } from "@/types/portfolio";

/*
 * Server-only auth helpers. The team passwords live ONLY as bcrypt hashes in
 * the server environment (.env.local) — they are never sent to, or referenced
 * by, the client. Validation happens here, on the server, via bcrypt.compare.
 */

// Hashes are stored base64-encoded in env so their bcrypt "$" characters
// aren't mangled by dotenv variable-expansion.
const b64 = (v?: string) => (v ? Buffer.from(v, "base64").toString("utf8") : "");
const CREATE_HASH = b64(process.env.CREATE_PASSWORD_HASH_B64);
const ADMIN_HASH = b64(process.env.ADMIN_PASSWORD_HASH_B64);

export async function verifyCreatePassword(pw: string): Promise<boolean> {
  if (!pw || !CREATE_HASH) return false;
  try { return await bcrypt.compare(pw, CREATE_HASH); } catch { return false; }
}

export async function verifyAdminPassword(pw: string): Promise<boolean> {
  if (!pw || !ADMIN_HASH) return false;
  try { return await bcrypt.compare(pw, ADMIN_HASH); } catch { return false; }
}

/** Whether an (already-formatted) employee code is registered/allowed. */
export async function isCodeAllowed(code: string): Promise<boolean> {
  const col = await empCodes();
  const doc = await col.findOne({ code: normalizeCode(code) });
  return !!doc;
}

/** Register a new employee code. Returns "added" | "exists". */
export async function registerEmpCode(code: string): Promise<"added" | "exists"> {
  const col = await empCodes();
  const c = normalizeCode(code);
  const existing = await col.findOne({ code: c });
  if (existing) return "exists";
  await col.insertOne({ code: c, addedAt: new Date().toISOString() });
  return "added";
}

/** Seed TM0001–TM0038 once, if the collection is empty. */
export async function ensureEmpCodesSeeded(): Promise<void> {
  const col = await empCodes();
  const count = await col.estimatedDocumentCount();
  if (count > 0) return;
  const now = new Date().toISOString();
  const docs = Array.from({ length: 38 }, (_, i) => ({
    code: `TM${String(i + 1).padStart(4, "0")}`,
    addedAt: now,
  }));
  try {
    await col.insertMany(docs, { ordered: false });
  } catch {
    /* ignore duplicate-key races */
  }
}
