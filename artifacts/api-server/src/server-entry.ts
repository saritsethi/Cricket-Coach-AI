// Vercel serverless entry for Cricket Coach AI.
// Bundled by script/build.ts (esbuild) to plain JavaScript at api/index.js,
// which is the file Vercel deploys as the function. The build regenerates
// api/index.js on every deploy;
// the committed copy is the seed the first deploy uses.
// The Express app is created once per cold start and reused across
// invocations. Static files come from dist/public (see vercel.json).
import { createApp } from "../../../server/app";
import { serveStatic } from "../../../server/static";
import type { Express } from "express";
let appPromise: Promise<Express> | null = null;
async function getApp(): Promise<Express> {
  if (!appPromise) {
    appPromise = (async () => {
      const { app } = await createApp();
      try {
        serveStatic(app);
      } catch (error) {
        console.warn("Static files not available; serving API only.", error);
      }
      return app;
    })();
  }
  return appPromise;
}
async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
export default handler;
