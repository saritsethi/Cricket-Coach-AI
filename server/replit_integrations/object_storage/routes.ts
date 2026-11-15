import type { Express } from "express";
import { handleUpload } from "@vercel/blob/client";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
    // Client upload flow (Vercel Blob): the browser calls upload() from
  // @vercel/blob/client with handleUploadUrl "/api/blob/handle-upload".
  // This route mints the client token; the client then uploads directly
  // to Blob storage and receives the blob pathname back.
  app.post("/api/blob/handle-upload", async (req, res) => {
    try {
      const jsonResponse = await handleUpload({
        body: req.body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          return {
            allowedContentTypes: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/avif",
            ],
            tokenPayload: JSON.stringify({ pathname }),
          };
        },
        onUploadCompleted: async ({ blob }) => {
          void blob;
        },
      });
      res.status(200).json(jsonResponse);
    } catch (error) {
      console.error("Error handling blob upload:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.use((req, res, next) => {
    if (req.method === "GET" && req.path.startsWith("/objects/")) {
      (async () => {
        try {
          const objectFile = await objectStorageService.getObjectEntityFile(req.path);
          await objectStorageService.downloadObject(objectFile, res);
        } catch (error) {
          console.error("Error serving object:", error);
          if (error instanceof ObjectNotFoundError) {
            return res.status(404).json({ error: "Object not found" });
          }
          return res.status(500).json({ error: "Failed to serve object" });
        }
      })();
    } else {
      next();
    }
  });
}

