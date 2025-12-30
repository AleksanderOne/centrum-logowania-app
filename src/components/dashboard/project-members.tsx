'use client';

import { useState, useEffect, useTransition } from 'react';
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
import { ColoredButton } from '@/components/atoms';
import { ModalContainer, ModalFooter } from '@/components/molecules';

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

// Przycisk widoczności projektu - zunifikowany komponent
function VisibilityButton({
  isPublic,
  onClick,
  disabled,
  className = '',
}: {
  isPublic: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={`${className} ${
        isPublic
          ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/40 hover:bg-green-500/20 hover:border-green-500/60'
          : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/40 hover:bg-orange-500/20 hover:border-orange-500/60'
      }`}
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
  );
}

export function ProjectMembers({
  projectId,
  projectName,
  isPublic: initialIsPublic,
  onVisibilityChange,
}: ProjectMembersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isPublic, setIsPublic] = useState(initialIsPublic);

  useEffect(() => {
    setIsPublic(initialIsPublic);
  }, [initialIsPublic]);

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

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchMembers();
    }
  };

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

        const newIsPublic = !isPublic;
        setIsPublic(newIsPublic);
        toast.success(isPublic ? 'Projekt jest teraz prywatny' : 'Projekt jest teraz publiczny');
        onVisibilityChange?.(newIsPublic);
      } catch {
        toast.error('Błąd podczas zmiany widoczności projektu');
      }
    });
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onOpenChange={handleOpen}
      trigger={
        <ColoredButton color="indigo" icon={<Users className="w-4 h-4" />}>
          <span className="text-xs">Członkowie</span>
        </ColoredButton>
      }
      title="Członkowie projektu"
      titleIcon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />}
      headerExtra={
        <VisibilityButton
          isPublic={isPublic}
          onClick={handleToggleVisibility}
          disabled={isPending}
          className="hidden sm:inline-flex shrink-0"
        />
      }
      description={
        <>
          Zarządzaj dostępem do <strong>{projectName}</strong>
          {/* Przycisk widoczny tylko na mobile */}
          <VisibilityButton
            isPublic={isPublic}
            onClick={handleToggleVisibility}
            disabled={isPending}
            className="sm:hidden w-full mt-2"
          />
        </>
      }
      footer={
        <ModalFooter
          onClose={() => setIsOpen(false)}
          primaryAction={{
            label: isPublic ? 'Ustaw prywatny' : 'Ustaw publiczny',
            icon: isPending ? (
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
            ) : isPublic ? (
              <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
            ),
            onClick: handleToggleVisibility,
            disabled: isPending,
          }}
        />
      }
    >
      <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
        {/* Informacja o trybie */}
        <div
          className={`p-2 sm:p-3 rounded-lg border text-xs sm:text-sm ${isPublic ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}
        >
          <div className="flex items-center gap-2">
            {isPublic ? (
              <>
                <Globe className="h-4 w-4 text-green-500 shrink-0" />
                <span>
                  <strong>Projekt publiczny</strong> – każdy użytkownik systemu może się zalogować
                </span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 text-orange-500 shrink-0" />
                <span>
                  <strong>Projekt prywatny</strong> – tylko zaproszeni członkowie mogą się zalogować
                </span>
              </>
            )}
          </div>
        </div>

        {/* Formularz dodawania członka (tylko dla prywatnych) */}
        {!isPublic && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Email użytkownika..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              disabled={isPending}
              className="text-sm"
            />
            <Button
              onClick={handleAddMember}
              disabled={isPending || !email.trim()}
              size="sm"
              className="w-full sm:w-auto"
            >
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
              <div className="text-center text-muted-foreground py-6 sm:py-8">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Brak członków</p>
                <p className="text-xs">
                  Dodaj użytkowników, którzy mogą logować się do tego projektu.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-xs sm:text-sm truncate">
                            {member.user.email}
                          </div>
                          {member.user.name && (
                            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              {member.user.name}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                          {member.role}
                        </Badge>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isPending}
                            className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
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
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      </div>
    </ModalContainer>
  );
}
