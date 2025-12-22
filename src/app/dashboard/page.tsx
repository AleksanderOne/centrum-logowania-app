import { auth } from "@/lib/auth"
import { CreateProjectForm } from "@/components/dashboard/create-project-form"
import { ProjectList } from "@/components/dashboard/project-list"
import { getUserProjects } from "@/actions/project"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
    // Sesja jest sprawdzana w middleware i layout, ale potrzebujemy usera do logiki (jeśli nie, getUserProjects to ogarnie)
    const projects = await getUserProjects()

    return (
        <div className="flex flex-col h-full">
            {/* Fixed Header Section */}
            <div className="p-4 md:p-8 pt-6 pb-2 shrink-0 space-y-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold tracking-tight">Twoje Projekty</h2>
                        <Badge variant="secondary" className="px-2">
                            {projects.length}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        Zarządzaj aplikacjami podłączonymi do Centrum Logowania.
                    </p>
                </div>
                <Separator />
                <CreateProjectForm />
            </div>

            {/* Scrollable Project List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-8 pt-2">
                <ProjectList projects={projects} />
            </div>
        </div>
    )
}
