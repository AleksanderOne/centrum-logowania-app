import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

interface ClaLogoProps {
  className?: string;
  size?: number;
}

export const ClaLogo = ({ className, size = 24 }: ClaLogoProps) => {
  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl dark:bg-emerald-400/20" />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10 w-full h-full text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    </div>
  );
};
