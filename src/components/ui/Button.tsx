import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
export function Button({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    <button className={clsx('btn', className)} {...props}>
      {children}
    </button>
  );
}
