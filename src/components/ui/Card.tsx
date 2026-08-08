import { type HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgba(32,35,31,0.04)] ${className}`}
      {...props}
    />
  );
}
