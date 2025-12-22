import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="absolute top-4 left-4 flex items-center gap-2 font-bold text-xl">
        <ShieldCheck className="w-8 h-8 text-primary" />
        <span>Centrum Logowania</span>
      </div>

      <main className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Witaj ponownie</h1>
          <p className="text-muted-foreground">Centralny system uwierzytelniania dla Twoich aplikacji.</p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-lg">
          <CardHeader>
            <CardTitle>Zaloguj się</CardTitle>
            <CardDescription>Wprowadź swoje dane, aby uzyskać dostęp do panelu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="imie@przyklad.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input id="password" type="password" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full">Zaloguj się</Button>
            <Button variant="outline" className="w-full">
              Zaloguj przez Google
            </Button>
            <div className="text-center text-sm text-muted-foreground mt-2">
              <a href="#" className="hover:text-primary hover:underline">
                Zapomniałeś hasła?
              </a>
            </div>
          </CardFooter>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Status systemu: <span className="text-green-500 font-medium">Operational</span></p>
          <p className="mt-2 text-xs">v1.0.0 • Powered by Next.js & shadcn/ui</p>
        </div>
      </main>
    </div>
  );
}
