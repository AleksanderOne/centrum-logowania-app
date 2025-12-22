"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutGrid, User, LogOut, ShieldCheck } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "next-auth/react"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    user: {
        name?: string | null
        email?: string | null
        image?: string | null
    }
}

export function SidebarNav({ className, user, ...props }: SidebarNavProps) {
    const pathname = usePathname()

    const items = [
        {
            title: "Projekty",
            href: "/dashboard",
            icon: LayoutGrid,
        },
        {
            title: "Użytkownik",
            href: "/dashboard/user",
            icon: User,
        },
    ]

    return (
        <nav
            className={cn(
                "flex flex-col h-full border-r bg-card",
                className
            )}
            {...props}
        >
            {/* Logo */}
            <div className="p-6">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <ShieldCheck className="w-6 h-6" suppressHydrationWarning />
                    <span>Centrum</span>
                </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 px-4 space-y-2">
                {items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                        <Button
                            key={item.href}
                            asChild
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start gap-2",
                                isActive && "bg-secondary"
                            )}
                        >
                            <Link href={item.href}>
                                <item.icon className="w-4 h-4" suppressHydrationWarning />
                                {item.title}
                            </Link>
                        </Button>
                    )
                })}
            </div>

            {/* User Info & Footer Actions */}
            <div className="p-4 border-t space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <Avatar>
                        <AvatarImage src={user.image || ""} />
                        <AvatarFallback>
                            {user.name?.[0] || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">
                            {user.name || "Użytkownik"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between px-2">
                    <ModeToggle />
                    {/* Tutaj przycisk wylogowania obsłużymy osobno lub jako link */}
                </div>
            </div>
        </nav>
    )
}
