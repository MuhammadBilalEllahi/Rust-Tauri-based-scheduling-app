import { useEffect, useState } from "react";

type Props = {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
};

export function TodoItemEditor({ initialTitle, onSave, onCancel }: Props) {
  const [value, setValue] = useState(initialTitle);

  useEffect(() => {
    setValue(initialTitle);
  }, [initialTitle]);

  return (
    <input
      type="text"
      className="input todo-item-editor"
      value={value}
      aria-label="Edit task title"
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const next = value.trim();
          if (next) {
            onSave(next);
          } else {
            onCancel();
          }
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => {
        const next = value.trim();
        if (next && next !== initialTitle.trim()) {
          onSave(next);
        } else {
          onCancel();
        }
      }}
    />
  );
}
