import { type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base = "rounded-md px-4 py-2 text-sm font-medium";
  const variantClass =
    variant === "primary"
      ? "bg-black text-white"
      : "border text-gray-800";

  return <button className={`${base} ${variantClass} ${className}`} {...props} />;
}
