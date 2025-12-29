'use client';

import { Button } from '@/components/ui/button';
import { Check, Copy, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function UserIdSection({ userId }: { userId: string }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(userId);
    toast.success('Skopiowano ID użytkownika');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between font-mono text-xs bg-purple-50 dark:bg-purple-950/30 p-2 rounded border border-purple-200 dark:border-purple-800 overflow-hidden">
      <div className="flex items-center gap-2 min-w-0 flex-1 text-purple-700 dark:text-purple-300">
        <User className="h-3 w-3 shrink-0" />
        <span className="truncate">{userId}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 ml-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400"
        onClick={handleCopy}
        title="Kopiuj ID użytkownika"
      >
        {isCopied ? <Check className="w-3 h-3 scale-110" /> : <Copy className="w-3 h-3" />}
      </Button>
    </div>
  );
}
