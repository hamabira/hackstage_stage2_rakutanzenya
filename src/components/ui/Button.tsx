import { type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex min-h-10 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
  const variantClass =
    variant === "primary"
      ? "bg-[#72d350] text-[#20231f] hover:bg-[#64c544]"
      : "border bg-white text-[#333831] hover:bg-[#f5f6f2]";

  return <button className={`${base} ${variantClass} ${className}`} {...props} />;
}
