"use client"

import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor } from "lucide-react"
import { useEffect, useState } from "react"

export function ThemeCard() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Unikamy hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Wygląd aplikacji</CardTitle>
                    <CardDescription>Ładowanie ustawień...</CardDescription>
                </CardHeader>
                <CardContent className="h-24" />
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Wygląd aplikacji</CardTitle>
                <CardDescription>
                    Wybierz preferowany motyw interfejsu.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
                <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className="flex flex-col gap-2 h-auto py-4"
                    onClick={() => setTheme("light")}
                >
                    <Sun className="h-6 w-6" suppressHydrationWarning />
                    <span className="font-medium">Jasny</span>
                </Button>
                <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className="flex flex-col gap-2 h-auto py-4"
                    onClick={() => setTheme("dark")}
                >
                    <Moon className="h-6 w-6" suppressHydrationWarning />
                    <span className="font-medium">Ciemny</span>
                </Button>
                <Button
                    variant={theme === "system" ? "default" : "outline"}
                    className="flex flex-col gap-2 h-auto py-4"
                    onClick={() => setTheme("system")}
                >
                    <Monitor className="h-6 w-6" suppressHydrationWarning />
                    <span className="font-medium">System</span>
                </Button>
            </CardContent>
        </Card>
    )
}
