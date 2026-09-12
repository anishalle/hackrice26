import { chromium } from "playwright";

const OUT = process.argv[2] ?? "shots";
const BASE = "http://localhost:3000";

// Profiles to exercise. The whole product claim is that these render
// differently, so the inspection has to cover more than the default.
const PROFILES = {
  default: { vision: 3, hearing: 3, motor: 3, speech: 3, cognitive: 3 },
  blind:   { vision: 0, hearing: 3, motor: 3, speech: 3, cognitive: 3 },
  motor:   { vision: 3, hearing: 3, motor: 1, speech: 3, cognitive: 3 },
  lowvis:  { vision: 1, hearing: 2, motor: 2, speech: 3, cognitive: 1 },
};

const SHOTS = [
  { name: "landing",  path: "/",        profile: "default" },
  { name: "profile",  path: "/profile", profile: "motor"   },
  { name: "verify",   path: "/verify",  profile: "motor"   },
  { name: "consent",  path: "/consent", profile: "motor"   },
  { name: "feed",     path: "/feed",    profile: "motor"   },
  { name: "agent",    path: "/agent",   profile: "motor"   },
  { name: "feed-lowvis", path: "/feed", profile: "lowvis"  },
  { name: "feed-blind",  path: "/feed", profile: "blind"   },
];

const VIEWPORTS = [
  { tag: "desktop", width: 1440, height: 900 },
  { tag: "mobile",  width: 390,  height: 844 },
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

for (const vp of VIEWPORTS) {
  for (const shot of SHOTS) {
    if (vp.tag === "mobile" && shot.name.includes("-")) continue; // variants desktop-only
    for (const theme of vp.tag === "desktop" && shot.name === "landing" ? ["light", "dark"] : ["light"]) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        reducedMotion: "reduce",
      });
      const session = {
        profile: PROFILES[shot.profile],
        profileComplete: true,
        verifiedWith: "provider-attestation",
        attestation: shot.path === "/consent" ? null : { provider: "Meridian Health", attestedAt: "2026-09-12T00:00:00.000Z", axes: ["motor", "speech"] },
        theme,
      };
      await ctx.addInitScript(`window.localStorage.setItem("axis.session.v1", ${JSON.stringify(JSON.stringify(session))})`);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(BASE + shot.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(450);
      const suffix = theme === "dark" ? "-dark" : "";
      const file = `${OUT}/${vp.tag}-${shot.name}${suffix}.png`;
      await page.screenshot({ path: file, fullPage: vp.tag === "desktop" });
      // Cheap defect scan that a screenshot cannot show.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      console.log(`${file}  errors=${errors.length}${errors.length ? " :: " + errors.join(" | ").slice(0, 300) : ""}  hscroll=${overflow}`);
      await ctx.close();
    }
  }
}

await browser.close();
