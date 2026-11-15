// Upload hook backed by Vercel Blob (replaces the Replit presigned-URL flow).
// Step 1: the browser calls upload() from @vercel/blob/client, which POSTs
// to /api/blob/handle-upload for a client token and then uploads directly
// to Blob storage. Step 2: the returned objectPath identifies the blob
// for GET /objects/<pathname>. Private uploads go under .private/uploads.
import { useCallback, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { UppyFile } from "@uppy/core";
export interface UploadResponse {
  uploadURL: string;
  objectPath: string;
}
export interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const pathname = `.private/uploads/${crypto.randomUUID()}-${safeName}`;
        const blob = await upload(pathname, file, {
          access: "private",
          handleUploadUrl: "/api/blob/handle-upload",
        });
        const response: UploadResponse = {
          uploadURL: blob.url,
          objectPath: `/objects/${blob.pathname}`,
        };
        setProgress(100);
        options.onSuccess?.(response);
        return response;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error("Upload failed");
        setError(uploadError);
        options.onError?.(uploadError);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [options],
  );
  const getUploadParameters = useCallback(
    async (_file: UppyFile): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      throw new Error(
        "Direct presigned uploads are not supported with Vercel Blob. Use uploadFile() from this hook instead, which uploads through @vercel/blob/client.",
      );
    },
    [],
  );
  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}
