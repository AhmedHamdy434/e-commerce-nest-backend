import { Transform } from 'class-transformer';

export function ToStringArray() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return Array.isArray(value) ? value : value ? [value] : undefined;
    }

    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as unknown[]) : [parsed];
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  });
}
