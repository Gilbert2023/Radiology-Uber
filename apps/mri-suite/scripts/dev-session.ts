// Developer utility: create a session for a user and print the cookie value (for curl/smoke tests).
import "./loadenv";
import { randomBytes, createHash } from "node:crypto";
import { getPool } from "../src/lib/db";
const username = process.argv[2] || "supervisor";
(async () => {
  const pool = getPool();
  const u = (await pool.query("SELECT id FROM users WHERE username=$1", [username])).rows[0];
  if (!u) throw new Error("no such user");
  const token = randomBytes(32).toString("base64url");
  await pool.query("INSERT INTO sessions (id, user_id, expires_at) VALUES ($1,$2, now() + interval '2 hours')", [createHash("sha256").update(token).digest("hex"), u.id]);
  console.log(token);
  await pool.end();
})();
