import { Heart } from 'lucide-react';

export function DashboardFooter() {
  return (
    <footer className="w-full py-4 mt-auto border-t">
      <div className="container flex items-center justify-center gap-1 text-sm text-muted-foreground">
        <span>Zakodowane z pasji przez</span>
        <a
          href="https://www.linkedin.com/in/aleksanderjedynak/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline-offset-4 hover:underline"
        >
          AleksanderOne
        </a>
        <Heart
          className="h-4 w-4 text-red-500 fill-red-500 animate-pulse"
          suppressHydrationWarning
        />
      </div>
    </footer>
  );
}
