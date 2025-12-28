'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Users, UserPlus, Trash2, Shield, Lock, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectMember {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    email: string;
    name: string | null;
  };
}

interface ProjectMembersProps {
  projectId: string;
  projectName: string;
  isPublic: boolean;
  onVisibilityChange?: (isPublic: boolean) => void;
}

export function ProjectMembers({
  projectId,
  projectName,
  isPublic,
  onVisibilityChange,
}: ProjectMembersProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/project/${projectId}/members`);
      if (!response.ok) throw new Error('Nie udało się pobrać członków');
      const data = await response.json();
      setMembers(data.members || []);
    } catch {
      toast.error('Błąd podczas pobierania członków projektu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAddMember = () => {
    if (!email.trim()) {
      toast.error('Podaj adres email');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/project/${projectId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Nie udało się dodać członka');
        }

        toast.success('Członek został dodany');
        setEmail('');
        fetchMembers();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Błąd podczas dodawania członka');
      }
    });
  };

  const handleRemoveMember = (memberId: string, memberEmail: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/project/${projectId}/members/${memberId}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Nie udało się usunąć członka');

        toast.success(`Usunięto ${memberEmail} z projektu`);
        fetchMembers();
      } catch {
        toast.error('Błąd podczas usuwania członka');
      }
    });
  };

  const handleToggleVisibility = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/project/${projectId}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublic: !isPublic }),
        });

        if (!response.ok) throw new Error('Nie udało się zmienić widoczności');

        toast.success(isPublic ? 'Projekt jest teraz prywatny' : 'Projekt jest teraz publiczny');
        onVisibilityChange?.(!isPublic);
      } catch {
        toast.error('Błąd podczas zmiany widoczności projektu');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Członkowie projektu
            </CardTitle>
            <CardDescription>
              Zarządzaj dostępem do <strong>{projectName}</strong>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleVisibility}
            disabled={isPending}
            className={
              isPublic
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/40 hover:bg-green-500/20 hover:border-green-500/60'
                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/40 hover:bg-orange-500/20 hover:border-orange-500/60'
            }
          >
            {isPublic ? (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Publiczny
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Prywatny
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informacja o trybie */}
        <div
          className={`p-3 rounded-lg border ${isPublic ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}
        >
          <div className="flex items-center gap-2">
            {isPublic ? (
              <>
                <Globe className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  <strong>Projekt publiczny</strong> – każdy użytkownik systemu może się zalogować
                </span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  <strong>Projekt prywatny</strong> – tylko zaproszeni członkowie mogą się zalogować
                </span>
              </>
            )}
          </div>
        </div>

        {/* Formularz dodawania członka (tylko dla prywatnych) */}
        {!isPublic && (
          <div className="flex gap-2">
            <Input
              placeholder="Email użytkownika..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              disabled={isPending}
            />
            <Button onClick={handleAddMember} disabled={isPending || !email.trim()}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Dodaj
            </Button>
          </div>
        )}

        {/* Lista członków */}
        {!isPublic && (
          <>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Brak członków. Dodaj użytkowników, którzy mogą logować się do tego projektu.
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{member.user.email}</div>
                          {member.user.name && (
                            <div className="text-xs text-muted-foreground">{member.user.name}</div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {member.role}
                        </Badge>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={isPending}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usunąć członka?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Czy na pewno chcesz usunąć <strong>{member.user.email}</strong> z
                              projektu? Użytkownik straci możliwość logowania się do tej aplikacji.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveMember(member.id, member.user.email)}
                            >
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
