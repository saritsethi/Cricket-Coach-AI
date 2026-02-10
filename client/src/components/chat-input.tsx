import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X, Loader2, FileImage } from "lucide-react";
import type { AppMode } from "@shared/schema";

interface AttachedImage {
  file: File;
  preview: string;
  objectPath?: string;
  uploading: boolean;
}

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string, imageUrls?: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  mode?: AppMode;
}

export function ChatInput({ onSend, disabled, placeholder, value, onChange, mode }: ChatInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const setCurrentValue = onChange || setInternalValue;
  const allowMultiple = mode === "captain";
  const isAnyUploading = attachedImages.some(img => img.uploading);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [currentValue]);

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      return objectPath;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const validFiles = files.filter(f => allowedTypes.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (validFiles.length === 0) return;

    const filesToProcess = allowMultiple ? validFiles : [validFiles[0]];

    if (!allowMultiple && attachedImages.length > 0) {
      attachedImages.forEach(img => URL.revokeObjectURL(img.preview));
      setAttachedImages([]);
    }

    const newImages: AttachedImage[] = filesToProcess.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));

    setAttachedImages(prev => allowMultiple ? [...prev, ...newImages] : newImages);

    for (let i = 0; i < filesToProcess.length; i++) {
      const objectPath = await uploadFile(filesToProcess[i]);
      setAttachedImages(prev =>
        prev.map(img =>
          img.file === filesToProcess[i]
            ? { ...img, objectPath: objectPath || undefined, uploading: false }
            : img
        )
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachedImages(prev => {
      const img = prev[index];
      if (img?.preview) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = () => {
    if ((!currentValue.trim() && attachedImages.length === 0) || disabled || isAnyUploading) return;

    const messageText = currentValue.trim() || (attachedImages.length > 1 ? "Please analyze these scorecards." : "Please analyze this image.");
    const uploadedPaths = attachedImages.filter(img => img.objectPath).map(img => img.objectPath!);

    if (uploadedPaths.length > 1) {
      onSend(messageText, undefined, uploadedPaths);
    } else if (uploadedPaths.length === 1) {
      onSend(messageText, uploadedPaths[0]);
    } else {
      onSend(messageText);
    }

    setCurrentValue("");
    attachedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setAttachedImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background">
      {attachedImages.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3" data-testid="image-preview-container">
          {attachedImages.map((img, i) => (
            <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
              <img
                src={img.preview}
                alt={`Attached ${i + 1}`}
                className="w-full h-full object-cover"
                data-testid={`image-preview-${i}`}
              />
              {img.uploading && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                data-testid={`button-remove-attachment-${i}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {attachedImages.length > 1 && (
            <span className="text-xs text-muted-foreground">{attachedImages.length} scorecards</span>
          )}
        </div>
      )}
      <div className="flex items-end gap-2 p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple={allowMultiple}
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-file-upload"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isAnyUploading}
          data-testid="button-attach-image"
          title={allowMultiple ? "Attach scorecards" : "Attach image"}
        >
          {allowMultiple ? <FileImage className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
        </Button>
        <Textarea
          ref={textareaRef}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask about cricket strategies, techniques, or equipment..."}
          disabled={disabled}
          rows={1}
          className="resize-none min-h-[40px] max-h-[160px] border-border text-sm"
          data-testid="input-chat-message"
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || isAnyUploading || (!currentValue.trim() && attachedImages.length === 0)}
          size="icon"
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
