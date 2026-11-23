// End-to-end smoke test against a running server with demo data (npm run build && npm start).
// Usage: BASE_URL=http://localhost:3000 node tests/e2e/smoke.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PW = "Demo@MRI2026";
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) failures++; };

const browser = await pw.chromium.launch();
async function login(username, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, ...opts });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("#username", username);
  await page.fill("#password", PW);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }), page.click("button[type=submit]")]);
  return { ctx, page };
}

// 1. Authentication
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/command-centre`);
  check(page.url().includes("/login"), "unauthenticated user is redirected to login");
  await page.fill("#username", "supervisor");
  await page.fill("#password", "wrong-password");
  await page.click("button[type=submit]");
  await page.waitForSelector("form [role=alert]");
  check((await page.textContent("form [role=alert]")).includes("Invalid username or password"), "wrong password shows a generic error");
  const r = await page.request.get(`${BASE}/api/export/monthly?format=pdf`);
  check(r.status() === 401, "export API requires authentication");
  await ctx.close();
}

// 2. Role landing pages and access control
const landing = { supervisor: "/command-centre", radiographer1: "/command-centre", nurse1: "/command-centre", receptionist1: "/appointments", mrso: "/command-centre", manager: "/executive", admin: "/admin/users" };
for (const [u, path] of Object.entries(landing)) {
  const { ctx, page } = await login(u);
  check(new URL(page.url()).pathname === path, `${u} lands on ${path}`);
  await ctx.close();
}
{
  const { ctx, page } = await login("receptionist1");
  await page.goto(`${BASE}/screening`);
  check(page.url().includes("/access-denied"), "receptionist cannot open MRI safety screening");
  await page.goto(`${BASE}/executive`);
  check(page.url().includes("/access-denied"), "receptionist cannot open executive dashboard");
  const nav = await page.$$eval("nav[aria-label='Main navigation'] a", (a) => a.map((x) => x.textContent));
  check(!nav.some((t) => /Executive|Audit|Roles/.test(t)), "receptionist navigation hides unauthorised modules");
  await ctx.close();
}
{
  const { ctx, page } = await login("admin");
  await page.goto(`${BASE}/patients`);
  check(page.url().includes("/access-denied"), "system administrator has no patient access by default");
  const r = await page.request.get(`${BASE}/api/patients/search?q=me`);
  check(r.status() === 403, "patient search API enforces permissions");
  await ctx.close();
}

// 3. UI-driven safety screening by a radiographer
{
  const { ctx, page } = await login("radiographer1");
  await page.goto(`${BASE}/worklist?tab=screening`);
  const links = await page.$$eval("table a[href^='/appointments/']", (a) => a.map((x) => x.getAttribute("href")));
  let done = false;
  for (const href of [...new Set(links)]) {
    await page.goto(`${BASE}${href.split("#")[0]}`);
    const hasImplant = await page.$("text=Implants / devices");
    const form = await page.$("button:has-text('Save screening'), button:has-text('Update screening')");
    if (hasImplant || !form) continue;
    for (const r of await page.$$("input[type=radio][value=NO]")) await r.check({ force: true });
    const preg = await page.$("select[name=pregnancyStatus]");
    if (preg) await preg.selectOption("NOT_PREGNANT").catch(() => {});
    await form.click();
    await page.waitForSelector("text=Screening saved", { timeout: 15000 });
    await page.click("button:has-text('Clear for MRI')");
    await page.waitForSelector("text=Patient cleared for MRI", { timeout: 15000 });
    await page.reload();
    check((await page.textContent("body")).includes("Cleared by"), "radiographer completes routine screening and clearance through the UI");
    done = true;
    break;
  }
  if (!done) check(false, "found a patient awaiting routine screening");
  await ctx.close();
}

// 4. Exports and sign-out
{
  const { ctx, page } = await login("supervisor");
  const pdf = await page.request.get(`${BASE}/api/export/monthly?format=pdf`);
  const body = await pdf.body();
  check(pdf.status() === 200 && pdf.headers()["content-type"] === "application/pdf" && body.subarray(0, 5).toString() === "%PDF-", `monthly PDF export (${body.length} bytes)`);
  const x = await page.request.get(`${BASE}/api/export/pacs?format=xlsx`);
  const xb = await x.body();
  check(x.status() === 200 && xb.subarray(0, 2).toString() === "PK", `PACS Excel export (${xb.length} bytes)`);
  const nurse = await login("nurse1");
  const denied = await nurse.page.request.get(`${BASE}/api/export/monthly?format=pdf`);
  check(denied.status() === 403, "nurse cannot export management reports");
  await nurse.ctx.close();
  await page.goto(`${BASE}/command-centre`);
  await page.click("button[aria-label='Sign out']");
  await page.waitForURL(/\/login/);
  await page.goto(`${BASE}/command-centre`);
  check(page.url().includes("/login"), "sign-out ends the session");
  await ctx.close();
}

// 5. Responsive layout (phone + tablet)
for (const [name, device] of [["phone", pw.devices["iPhone 13"]], ["tablet", pw.devices["iPad (gen 7)"]]]) {
  const { ctx, page } = await login("supervisor", device);
  for (const path of ["/command-centre", "/appointments", "/pacs", "/executive"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(overflow <= 1, `${name}: ${path} has no horizontal page scroll (overflow ${overflow}px)`);
  }
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll end-to-end checks passed");
process.exit(failures ? 1 : 0);
