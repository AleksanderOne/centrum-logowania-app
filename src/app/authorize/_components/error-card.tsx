import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorCardProps {
  title: string;
  message: string;
  code?: string;
  backUrl?: string; // Opcjonalny URL powrotu
}

export function ErrorCard({ title, message, code, backUrl }: ErrorCardProps) {
  const href = backUrl || '/';
  const label = backUrl ? 'Wróć do aplikacji' : 'Wróć do strony głównej';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md border-red-200 dark:border-red-900/50 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-red-100 dark:bg-red-900/20 p-3 rounded-full mb-4 w-fit">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
          <CardTitle className="text-xl text-red-700 dark:text-red-400">{title}</CardTitle>
          <CardDescription className="text-base mt-2">{message}</CardDescription>
        </CardHeader>
        {code && (
          <CardContent className="pb-2">
            <div className="bg-muted/50 p-2 rounded text-xs font-mono text-center text-muted-foreground break-all">
              {code}
            </div>
          </CardContent>
        )}
        <CardContent className="flex justify-center pt-4 pb-6">
          <Link href={href}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {label}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
