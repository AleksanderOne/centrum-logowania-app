import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { DashboardFooter } from "@/components/dashboard/dashboard-footer"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { LayoutGrid, User } from "lucide-react"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user) {
        redirect("/")
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex w-64 flex-col border-r h-full bg-card">
                <SidebarNav user={session.user} className="h-full" />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Navigation */}
                <div className="md:hidden border-b p-4 bg-card flex justify-between items-center shrink-0">
                    <Link href="/dashboard" className="font-bold text-lg flex items-center gap-2">
                        <span className="text-primary">Centrum</span>
                    </Link>
                    <nav className="flex gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                            <LayoutGrid className="w-4 h-4" suppressHydrationWarning />
                            Projekty
                        </Link>
                        <Link href="/dashboard/user" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                            <User className="w-4 h-4" suppressHydrationWarning />
                            Profil
                        </Link>
                    </nav>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </div>
                <DashboardFooter />
            </main>
        </div>
    )
}
