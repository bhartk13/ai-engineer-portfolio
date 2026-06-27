import { chromium } from "playwright";

async function testUrl(url, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Orchestrator chat");

  const prompt =
    "Review agent.py for production readiness and save findings.";
  await page.getByRole("button", { name: new RegExp(prompt.slice(0, 20)) }).click();

  await page.waitForTimeout(6000);

  const bodyText = await page.locator("body").innerText();
  const rootHtml = await page.locator("#root").innerHTML();
  const hasError = bodyText.includes("Error") || bodyText.includes("404");
  const hasDone = bodyText.includes("Done.");

  console.log(`\n=== ${label} (${url}) ===`);
  console.log("PAGE ERRORS:", errors.length ? errors : "none");
  console.log("ROOT EMPTY:", rootHtml.trim().length === 0);
  console.log("HAS ERROR TEXT:", hasError);
  console.log("HAS Done:", hasDone);
  console.log("ACTIVITY VISIBLE:", bodyText.includes("Live activity"));

  await browser.close();
  return { errors, rootEmpty: rootHtml.trim().length === 0 };
}

const r1 = await testUrl("http://localhost:8000/", "production");

if (r1.errors.length || r1.rootEmpty) {
  process.exit(1);
}
