import { useState, useRef, useEffect } from "react";
import { Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableDeviceNameProps {
  name: string;
  onRename: (newName: string) => void;
  className?: string;
}

export function EditableDeviceName({ name, onRename, className }: EditableDeviceNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setValue(name);
  }, [name]);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    } else {
      setValue(name);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setValue(name); setEditing(false); }
          }}
          maxLength={30}
          className={cn(
            "text-xs font-medium text-foreground bg-muted/20 border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:border-primary w-full max-w-[140px]",
            className
          )}
        />
        <button onClick={commit} className="shrink-0 p-0.5 rounded hover:bg-primary/10">
          <Check className="w-3 h-3 text-primary" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        "group flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary transition-colors text-left",
        className
      )}
      title="Tap to rename"
    >
      <span className="truncate">{name}</span>
      <Pencil className="w-2.5 h-2.5 text-muted-foreground/40 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
}
