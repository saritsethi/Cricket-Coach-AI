import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function ChatInput({ onSend, disabled, placeholder, value, onChange }: ChatInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const setCurrentValue = onChange || setInternalValue;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [currentValue]);

  const handleSubmit = () => {
    if (!currentValue.trim() || disabled) return;
    onSend(currentValue.trim());
    setCurrentValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-background">
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
        disabled={disabled || !currentValue.trim()}
        size="icon"
        data-testid="button-send-message"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
