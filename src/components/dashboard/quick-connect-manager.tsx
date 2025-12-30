'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Copy, Check, Trash2, Clock, KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { devLog } from '@/lib/utils';

interface QuickConnectCode {
  id: string;
  code: string;
  expiresAt: string;
  createdAt: string;
}

interface QuickConnectManagerProps {
  projectId: string;
  projectName: string;
}

const CopyButton = ({ text, fullWidth = false }: { text: string; fullWidth?: boolean }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Skopiowano kod!');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Wersja z tekstem dla mobile
  if (fullWidth) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="flex-1 text-xs gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50"
        onClick={handleCopy}
      >
        {isCopied ? (
          <>
            <Check className="w-3 h-3" />
            Skopiowano
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            Kopiuj
          </>
        )}
      </Button>
    );
  }

  // Wersja ikonowa dla desktop
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleCopy}
      title="Kopiuj kod"
    >
      {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
};

// Formatowanie czasu pozostałego do wygaśnięcia (z sekundami)
const formatTimeRemaining = (
  expiresAt: string
): { text: string; expired: boolean; seconds: number } => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return { text: 'Wygasł', expired: true, seconds: 0 };

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return {
      text: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      expired: false,
      seconds: totalSeconds,
    };
  }
  return { text: `${seconds}s`, expired: false, seconds: totalSeconds };
};

export const QuickConnectManager = ({ projectId, projectName }: QuickConnectManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codes, setCodes] = useState<QuickConnectCode[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, setTick] = useState(0); // Wymusza re-render co sekundę

  // Interwał do odświeżania countdown co sekundę
  useEffect(() => {
    if (!isOpen || codes.length === 0) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
      // Automatyczne usuwanie wygasłych kodów (bez zamykania modala)
      setCodes((prev) =>
        prev.filter((code) => {
          const { expired } = formatTimeRemaining(code.expiresAt);
          return !expired;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, codes.length]);

  // Pobierz aktywne kody
  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/project/${projectId}/setup-code`);
      if (!response.ok) throw new Error('Błąd pobierania kodów');
      const data = await response.json();
      devLog(`[QUICK-CONNECT] ✅ Pobrano ${data.codes?.length || 0} kodów`);
      setCodes(data.codes || []);
    } catch (error) {
      console.error('Błąd pobierania Quick Connect:', error);
      toast.error('Nie udało się pobrać kodów');
    } finally {
      setIsLoading(false);
    }
  };

  // Generuj nowy kod
  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/v1/project/${projectId}/setup-code`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Błąd generowania kodu');
      const newCode = await response.json();
      devLog(`[QUICK-CONNECT] ✅ Wygenerowano kod: ${newCode.code.substring(0, 15)}...`);
      setCodes((prev) => [newCode, ...prev]);
      toast.success('Wygenerowano nowy Quick Connect!');
    } catch (error) {
      console.error('Błąd generowania Quick Connect:', error);
      toast.error('Nie udało się wygenerować kodu');
    } finally {
      setIsGenerating(false);
    }
  };

  // Usuń kod
  const deleteCode = async (codeId: string) => {
    setDeletingId(codeId);
    try {
      const response = await fetch(`/api/v1/project/${projectId}/setup-code/${codeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Błąd usuwania kodu');
      setCodes((prev) => prev.filter((c) => c.id !== codeId));
      devLog(`[QUICK-CONNECT] ✅ Usunięto kod: ${codeId}`);
      toast.success('Usunięto Quick Connect');
    } catch (error) {
      console.error('Błąd usuwania Quick Connect:', error);
      toast.error('Nie udało się usunąć kodu');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      devLog(`[QUICK-CONNECT] 📥 Otwieranie managera kodów dla: ${projectId}`);
      fetchCodes();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="w-full gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
          variant="outline"
        >
          <KeyRound className="w-4 h-4" />
          <span className="text-xs">Quick Connect</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
            Quick Connect
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Jednorazowe kody do szybkiego podłączenia aplikacji do projektu{' '}
            <strong>{projectName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 sm:space-y-4 py-2 sm:py-4">
          {/* Instrukcja - kompaktowa na mobile */}
          <div className="bg-muted/50 p-2 sm:p-3 rounded-lg border text-xs sm:text-sm">
            <p className="text-muted-foreground">
              Quick Connect pozwala nowej aplikacji automatycznie pobrać konfigurację (API Key,
              Slug). Kod jest ważny <strong>1 minutę</strong> i może być użyty{' '}
              <strong>tylko raz</strong>.
            </p>
          </div>

          {/* Lista kodów */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-4 sm:py-6 text-muted-foreground">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">Brak aktywnych kodów</p>
              <p className="text-[10px] sm:text-xs">Wygeneruj nowy kod poniżej</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                Aktywne kody ({codes.length})
              </p>
              {codes.map((code) => (
                <div key={code.id} className="p-2 sm:p-3 rounded-lg bg-muted/30 border space-y-2">
                  {/* Dymek z kodem */}
                  <div className="bg-violet-500/10 rounded-md px-2 py-1.5 sm:px-3 sm:py-2 border border-violet-500/20">
                    <code className="text-[10px] sm:text-xs font-mono text-violet-600 dark:text-violet-400 block truncate">
                      {code.code}
                    </code>
                  </div>

                  {/* Odliczanie */}
                  <div className="flex items-center">
                    {(() => {
                      const { text, seconds } = formatTimeRemaining(code.expiresAt);
                      const isUrgent = seconds <= 15;
                      return (
                        <Badge
                          variant="outline"
                          className={`text-xs sm:text-[10px] gap-1 tabular-nums transition-colors duration-300 px-2 py-0.5 ${
                            isUrgent
                              ? 'border-red-500/50 text-red-500 bg-red-500/10 animate-pulse'
                              : 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                          }`}
                        >
                          <Clock className={`w-3 h-3 ${isUrgent ? 'text-red-500' : ''}`} />
                          {text}
                        </Badge>
                      );
                    })()}
                  </div>

                  {/* Przyciski: Kopiuj (zielony) | Usuń (czerwony) */}
                  <div className="flex gap-2">
                    <CopyButton text={code.code} fullWidth />
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50"
                      onClick={() => deleteCode(code.id)}
                      disabled={deletingId === code.id}
                    >
                      {deletingId === code.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Usuwanie...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Usuń
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stopka - przyciski obok siebie jak w modalu sesji */}
        <div className="shrink-0 flex flex-row gap-2 justify-between pt-2 border-t mt-2">
          <Button
            onClick={generateCode}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Wygeneruj
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
