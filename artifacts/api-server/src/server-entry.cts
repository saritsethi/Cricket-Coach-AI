// Vercel serverless entry for Cricket Coach AI.
// Bundled by script/build.ts (esbuild) to plain JavaScript at api/index.cjs,
// which is the file Vercel deploys as the function. Vercel only ever sees
// the plain-JS api/index.cjs; no .ts entry is deployed, because Vercel
// function typecheck misreads Express types and fails the build when it
// sees a .ts entry. The build regenerates api/index.cjs on every deploy;
// the committed copy is the seed the first deploy uses.
// The Express app is created once per cold start and reused across
// invocations. Static files come from dist/public (see vercel.json).
// Uses a direct CommonJS export so require() returns the handler itself.
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
module.exports = handler;
