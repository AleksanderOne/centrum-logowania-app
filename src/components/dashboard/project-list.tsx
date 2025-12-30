'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Globe, Trash2, Copy, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { deleteProject } from '@/actions/project';
import { useTransition, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { IntegrationTester } from './integration-tester';
import { SessionsMonitor } from './sessions-monitor';
import { ProjectMembers } from './project-members';
import { QuickConnectManager } from './quick-connect-manager';

interface Project {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  apiKey: string | null;
  isPublic: string | null;
  createdAt: Date | null;
}

interface ProjectListProps {
  projects: Project[];
  totalCount: number;
}

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success(`Skopiowano ${label}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 ml-2 transition-all duration-200"
      onClick={handleCopy}
      title={`Kopiuj ${label}`}
    >
      {isCopied ? (
        <Check className="w-3 h-3 text-green-500 scale-110" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </Button>
  );
};

export const ProjectList = ({ projects: initialProjects, totalCount }: ProjectListProps) => {
  const [isPending, startTransition] = useTransition();
  const [projects, setProjects] = useState(initialProjects);
  const router = useRouter();

  // Synchronizuj stan gdy props się zmienia (np. po router.refresh())
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // Aktualizacja stanu projektu przy zmianie widoczności
  const handleVisibilityChange = (projectId: string, isPublic: boolean) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, isPublic: isPublic ? 'true' : 'false' } : p))
    );
  };

  const handleDelete = (id: string) => {
    startTransition(() => {
      deleteProject(id).then((data) => {
        if (data.success) {
          toast.success(data.success);
          // Optymistyczna aktualizacja stanu - usuń z listy natychmiast
          setProjects((prev) => prev.filter((p) => p.id !== id));
          router.refresh();
        } else {
          toast.error(data.error);
        }
      });
    });
  };

  if (projects.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg bg-muted/50">
        <p className="text-muted-foreground">
          {totalCount === 0
            ? 'Nie masz jeszcze żadnych projektów.'
            : 'Nie znaleziono projektów pasujących do wyszukiwania.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {projects.map((project) => (
        <Card key={project.id} className="relative overflow-hidden group">
          {/* Decorative gradient border top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600"></div>

          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${
                      project.isPublic === 'true'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/40'
                        : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/40'
                    }`}
                  >
                    {project.isPublic === 'true' ? (
                      <>
                        <Globe className="w-3 h-3 mr-1" />
                        Publiczny
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        Prywatny
                      </>
                    )}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Globe className="w-3 h-3" />
                  {project.domain || 'Brak domeny'}
                </CardDescription>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-red-500 hover:bg-red-50 -mt-1 -mr-2"
                    disabled={isPending}
                    title="Usuń projekt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Czy jesteś pewny?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tej operacji nie można cofnąć. Projekt <strong>{project.name}</strong>{' '}
                      zostanie trwale usunięty wraz ze wszystkimi danymi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(project.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Usuń
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Client ID Section (Blue - Public) */}
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-100 dark:border-blue-900/50">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1 font-medium">
                <Globe className="w-3 h-3" /> Client ID (Slug)
              </div>
              <div className="flex items-center justify-between font-mono text-xs bg-white dark:bg-black/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                <span className="truncate max-w-[200px] text-zinc-600 dark:text-zinc-300">
                  {project.slug}
                </span>
                <CopyButton text={project.slug} label="Client ID" />
              </div>
            </div>

            {/* API Secret Key Section (Amber - Secret) */}
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-100 dark:border-amber-900/50">
              <div className="text-xs text-amber-600 dark:text-amber-500 mb-1 flex items-center gap-1 font-medium">
                <Key className="w-3 h-3" /> API Secret Key
              </div>
              <div className="flex items-center justify-between font-mono text-xs bg-white dark:bg-black/20 p-2 rounded border border-amber-200 dark:border-amber-800">
                <span className="truncate max-w-[200px] text-zinc-600 dark:text-zinc-300">
                  {project.apiKey}
                </span>
                <CopyButton text={project.apiKey!} label="API Key" />
              </div>
            </div>

            {/* Przyciski akcji - siatka 2x2 */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed">
              <IntegrationTester projectId={project.id} projectName={project.name} />
              <SessionsMonitor projectId={project.id} projectName={project.name} />
              <QuickConnectManager projectId={project.id} projectName={project.name} />
              <ProjectMembers
                projectId={project.id}
                projectName={project.name}
                isPublic={project.isPublic === 'true'}
                onVisibilityChange={(isPublic) => handleVisibilityChange(project.id, isPublic)}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
