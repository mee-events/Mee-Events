import { expect, test, type Page } from "@playwright/test";
import { isLoopbackHttpUrl } from "./loopback";

const SESSION_STORAGE_KEY = "mee-events.employee-session";
const EMPLOYEE_MOBILE = process.env.E2E_EMPLOYEE_MOBILE ?? "+919000000001";
const API_BASE = (process.env.E2E_API_BASE_URL ?? "").replace(/\/+$/, "");

function installLoopbackGuard(page: Page): { readonly blocked: string[] } {
  const blocked: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return;
    }
    if (!isLoopbackHttpUrl(url)) {
      blocked.push(new URL(url).origin);
    }
  });
  return { blocked };
}

test("employee login reaches authorized quotations surface", async ({
  page,
  request,
}) => {
  if (API_BASE.length === 0 || !isLoopbackHttpUrl(API_BASE)) {
    throw new Error(
      "E2E fail-closed: E2E_API_BASE_URL must be a loopback http(s) URL",
    );
  }

  const live = await request.get(`${API_BASE}/health/live`);
  if (!live.ok()) {
    throw new Error("API health/live must succeed on loopback");
  }

  const { blocked } = installLoopbackGuard(page);

  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Employee portal login" }),
  ).toBeVisible();

  await page.getByLabel("Mobile number").fill(EMPLOYEE_MOBILE);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("status")).toContainText("Local development OTP");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await page.waitForURL("**/leads");

  await page.goto("/quotes");
  await expect(page.getByRole("heading", { name: "Quotations" })).toBeVisible();
  await expect(page.getByText("Checking your session…")).toHaveCount(0);
  await expect(
    page.getByText("No quotations yet.").or(page.getByRole("table")),
  ).toBeVisible();

  const accessToken = await page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as { accessToken?: unknown };
      return typeof parsed.accessToken === "string" ? parsed.accessToken : null;
    } catch {
      return null;
    }
  }, SESSION_STORAGE_KEY);

  if (accessToken === null) {
    throw new Error("expected a stored employee session");
  }
  const logout = await request.post(`${API_BASE}/auth/logout`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!logout.ok()) {
    throw new Error("employee session logout must succeed");
  }
  await page.evaluate((key) => {
    window.sessionStorage.removeItem(key);
  }, SESSION_STORAGE_KEY);

  expect(blocked, "browser smoke must not call non-loopback hosts").toEqual([]);
});
