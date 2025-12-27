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

interface SetupCode {
  id: string;
  code: string;
  expiresAt: string;
  createdAt: string;
}

interface SetupCodeManagerProps {
  projectId: string;
  projectName: string;
}

const CopyButton = ({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Skopiowano kod!');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

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

// Formatowanie czasu pozostałego do wygaśnięcia
const formatTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return 'Wygasł';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

export const SetupCodeManager = ({ projectId, projectName }: SetupCodeManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [codes, setCodes] = useState<SetupCode[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pobierz aktywne kody
  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/project/${projectId}/setup-code`);
      if (!response.ok) throw new Error('Błąd pobierania kodów');
      const data = await response.json();
      setCodes(data.codes || []);
    } catch (error) {
      console.error('Błąd pobierania setup codes:', error);
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
      setCodes((prev) => [newCode, ...prev]);
      toast.success('Wygenerowano nowy Setup Code!');
    } catch (error) {
      console.error('Błąd generowania setup code:', error);
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
      toast.success('Usunięto Setup Code');
    } catch (error) {
      console.error('Błąd usuwania setup code:', error);
      toast.error('Nie udało się usunąć kodu');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchCodes();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20 hover:border-violet-500/50 transition-all"
          variant="outline"
        >
          <KeyRound className="w-4 h-4" />
          <span className="hidden sm:inline">Setup Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-violet-500" />
            Setup Codes
          </DialogTitle>
          <DialogDescription>
            Jednorazowe kody do szybkiej konfiguracji nowych aplikacji z projektem{' '}
            <strong>{projectName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instrukcja */}
          <div className="bg-muted/50 p-3 rounded-lg border text-sm">
            <p className="text-muted-foreground">
              Setup Code pozwala nowej aplikacji automatycznie pobrać konfigurację (API Key, Slug).
              Kod jest ważny <strong>24 godziny</strong> i może być użyty <strong>tylko raz</strong>
              .
            </p>
          </div>

          {/* Przycisk generowania */}
          <Button onClick={generateCode} disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Wygeneruj nowy kod
              </>
            )}
          </Button>

          {/* Lista kodów */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Brak aktywnych kodów</p>
              <p className="text-xs">Wygeneruj nowy kod powyżej</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Aktywne kody ({codes.length})
              </p>
              {codes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border"
                >
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-violet-600 dark:text-violet-400 block truncate">
                      {code.code}
                    </code>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(code.expiresAt)}
                      </Badge>
                    </div>
                  </div>
                  <CopyButton text={code.code} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0"
                    onClick={() => deleteCode(code.id)}
                    disabled={deletingId === code.id}
                    title="Usuń kod"
                  >
                    {deletingId === code.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Przykład użycia */}
          {codes.length > 0 && (
            <div className="bg-zinc-900 dark:bg-zinc-950 p-3 rounded-lg text-xs">
              <p className="text-zinc-400 mb-2">Użycie w nowej aplikacji:</p>
              <code className="text-green-400 block">
                node scripts/setup-with-code.mjs {codes[0]?.code.substring(0, 20)}...
              </code>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
