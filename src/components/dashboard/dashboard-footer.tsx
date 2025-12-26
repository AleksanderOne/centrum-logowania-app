import { Heart } from 'lucide-react';

export function DashboardFooter() {
  return (
    <footer className="w-full py-4 mt-auto border-t">
      <div className="container flex items-center justify-center gap-1 text-sm text-muted-foreground">
        <span>Zakodowane z</span>
        <Heart
          className="h-4 w-4 text-red-500 fill-red-500 animate-pulse"
          suppressHydrationWarning
        />
        <span>przez Aleksandra Jedynaka</span>
      </div>
    </footer>
  );
}
