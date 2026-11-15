// Object storage backed by Vercel Blob (replaces the Replit sidecar / GCS client).
// Keeps the same ObjectStorageService interface and the same
// PUBLIC_OBJECT_SEARCH_PATHS / PRIVATE_OBJECT_DIR env vars. The first path
// segment is the store name (e.g. "/cricket-coach/public" -> store
// "cricket-coach", prefix "public"). Vercel Blob has no per-object custom
// metadata, so ACL policy is path-based: anything under a public search path
// is public, anything under the private dir is private (see objectAcl.ts).
// Uploads use the client-upload flow: POST /api/blob/handle-upload with
// upload() from @vercel/blob/client (see routes.ts). There is no presigned
// PUT URL, so getObjectEntityUploadURL() throws a descriptive error.
import { del, get, head, list, put } from "@vercel/blob";
import { Readable } from "stream";
import type { Response } from "express";
import {
  canAccessObject,
  setObjectAclPolicy,
  type ObjectAclPolicy,
  type ObjectPermission,
} from "./objectAcl";
export interface BlobFile {
  pathname: string;
  url?: string;
}
function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }
  return token;
}
function toPathname(rawPath: string): string {
  let path = rawPath.trim();
  try {
    const url = new URL(path);
    path = url.pathname;
  } catch {
    // Not a URL; keep the raw path.
  }
  if (path.startsWith("/objects/")) {
    path = path.slice("/objects".length);
  }
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return path;
}
function toBlobPath(pathname: string): string {
  return pathname.replace(/^\//, "");
}
function isNotFound(error: unknown): boolean {
  return (error as { status?: number })?.status === 404;
}
export const objectStorageClient = { put, del, list, head, get };
export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}
export class ObjectStorageService {
  constructor() {}
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS is not set. The public search paths are required for object storage.",
      );
    }
    return paths;
  }
  getPrivateObjectDir(): string {
    const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR is not set. The private object directory is required for object storage.",
      );
    }
    return privateObjectDir;
  }
  async searchPublicObject(filePath: string): Promise<BlobFile | null> {
    const token = getBlobToken();
    const pathname = toPathname(filePath);
    const result = await list({ prefix: toBlobPath(pathname), limit: 1, token });
    const blob = result.blobs[0];
    if (!blob) {
      return null;
    }
    return { pathname: "/" + blob.pathname, url: blob.url };
  }
  async downloadObject(file: BlobFile, res: Response, cacheTtlSec: number = 3600) {
    const token = getBlobToken();
    let result;
    try {
      result = await get(toBlobPath(file.pathname), { token });
    } catch (error) {
      if (isNotFound(error)) {
        throw new ObjectNotFoundError();
      }
      throw error;
    }
    if (!result.stream) {
      throw new ObjectNotFoundError();
    }
    const contentType =
      (result as unknown as { blob?: { contentType?: string } }).blob?.contentType ||
      "application/octet-stream";
    res.set({
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    });
    Readable.fromWeb(result.stream as any).pipe(res);
  }
  async getObjectEntityUploadURL(): Promise<string> {
    throw new Error(
      "Direct presigned uploads are not supported with Vercel Blob. Use the client upload flow: POST /api/blob/handle-upload with upload() from @vercel/blob/client.",
    );
  }
  async getObjectEntityFile(objectPath: string): Promise<BlobFile> {
    return { pathname: toPathname(objectPath) };
  }
  normalizeObjectEntityPath(rawPath: string): string {
    return toPathname(rawPath);
  }
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const pathname = toPathname(rawPath);
    await setObjectAclPolicy(pathname, aclPolicy);
    return pathname;
  }
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId: string;
    objectFile: BlobFile;
    requestedPermission: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectPath: objectFile.pathname,
      requestedPermission,
    });
  }
}
export async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE";
  ttlSec: number;
}): Promise<string> {
  void bucketName;
  void method;
  void ttlSec;
  return `/objects/${objectName.replace(/^\//, "")}`;
}
