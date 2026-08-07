import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface AuthPageProps {
  action: (formData: FormData) => void | Promise<void>;
  alternateAction: {
    description: string;
    href: string;
    label: string;
  };
  error?: string;
  passwordMinLength?: number;
  submitLabel: string;
  title: string;
}

export function AuthPage({
  action,
  alternateAction,
  error,
  passwordMinLength,
  submitLabel,
  title,
}: AuthPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold">{title}</h1>

      {error && (
        <p
          aria-live="polite"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm" htmlFor="email">
          メールアドレス
          <input
            id="email"
            type="email"
            name="email"
            required
            className="rounded-md border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="password">
          パスワード
          <input
            id="password"
            type="password"
            name="password"
            required
            minLength={passwordMinLength}
            className="rounded-md border px-3 py-2"
          />
        </label>
        <Button type="submit">{submitLabel}</Button>
      </form>

      <p className="text-sm text-gray-600">
        {alternateAction.description}{" "}
        <Link href={alternateAction.href} className="underline">
          {alternateAction.label}
        </Link>
      </p>
    </main>
  );
}
