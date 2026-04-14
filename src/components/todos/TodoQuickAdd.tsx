import { useCallback, useState } from "react";

type Props = {
  onSubmit: (title: string) => void | Promise<void>;
  placeholder?: string;
};

export function TodoQuickAdd({ onSubmit, placeholder = "Add task" }: Props) {
  const [value, setValue] = useState("");

  const submit = useCallback(async () => {
    const title = value.trim();
    if (!title) {
      return;
    }
    setValue("");
    await onSubmit(title);
  }, [onSubmit, value]);

  return (
    <input
      type="text"
      className="input todo-quick-add"
      value={value}
      placeholder={placeholder}
      aria-label="Quick add task"
      autoComplete="off"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void submit();
        }
        if (e.key === "Escape") {
          setValue("");
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
