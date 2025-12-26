'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Key, Globe, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { deleteProject } from '@/actions/project';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
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

interface Project {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  apiKey: string | null;
  createdAt: Date | null;
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

export const ProjectList = ({ projects }: { projects: Project[] }) => {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleDelete = (id: string) => {
    // Confirm handled by UI now
    startTransition(() => {
      deleteProject(id).then((data) => {
        if (data.success) {
          toast.success(data.success);
          router.refresh();
        } else {
          toast.error(data.error);
        }
      });
    });
  };

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      (project.domain && project.domain.toLowerCase().includes(query)) ||
      project.slug.toLowerCase().includes(query) ||
      (project.apiKey && project.apiKey.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 mt-8">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj po nazwie, domenie, Client ID lub API Key..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          suppressHydrationWarning // Search icon is inside Input which might be client-side rendered? No, Search icon is absolute. Better adding to Input ? No input is ok. Add to Search icon just in case.
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-lg bg-muted/50">
          <p className="text-muted-foreground">
            {projects.length === 0
              ? 'Nie masz jeszcze żadnych projektów.'
              : 'Nie znaleziono projektów pasujących do wyszukiwania.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="relative overflow-hidden group">
              {/* Decorative gradient border top */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600"></div>

              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{project.name}</CardTitle>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
