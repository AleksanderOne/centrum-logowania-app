'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { History, RefreshCw, Trash2, Download, Search, Filter, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuditLogItem } from './AuditLogItem';
import {
  actionConfig,
  filterCategories,
  allFilterActions,
  formatDate,
  parseMetadata,
  type AuditLog,
} from './audit-config';

interface AuditLogsViewerProps {
  projectId?: string;
  limit?: number;
}

export function AuditLogsViewer({ projectId, limit = 100 }: AuditLogsViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dynamiczne filtrowanie akcji na podstawie wybranej kategorii
  const filterActions = useMemo(() => {
    if (filterCategory === 'all') {
      return [{ value: 'all', label: 'Wszystkie akcje', category: 'all' }, ...allFilterActions];
    }
    const filtered = allFilterActions.filter((a) => a.category === filterCategory);
    return [{ value: 'all', label: `Wszystkie (${filterCategory})`, category: 'all' }, ...filtered];
  }, [filterCategory]);

  const handleCategoryChange = (value: string) => {
    setFilterCategory(value);
    setFilterAction('all');
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = projectId
        ? `/api/v1/audit-logs?projectId=${projectId}&limit=${limit}`
        : `/api/v1/audit-logs?limit=${limit}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Nie udało się pobrać logów');
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch {
      setError('Błąd podczas pobierania logów audytu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, limit]);

  // Filtrowanie logów
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterAction !== 'all') {
        if (log.action !== filterAction) return false;
      } else if (filterCategory !== 'all') {
        const config = actionConfig[log.action];
        if (!config || config.category !== filterCategory) return false;
      }

      if (filterStatus !== 'all' && log.status !== filterStatus) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const config = actionConfig[log.action] || { label: log.action };
        const metadata = parseMetadata(log.metadata);

        const searchableText = [
          config.label,
          log.action,
          log.ipAddress,
          metadata?.userEmail,
          metadata?.projectName,
          metadata?.reason,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(query)) return false;
      }

      return true;
    });
  }, [logs, filterCategory, filterAction, filterStatus, searchQuery]);

  const deleteLogs = async () => {
    setDeleting(true);
    try {
      const body = projectId ? { projectId } : { all: true };

      const response = await fetch('/api/v1/audit-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Nie udało się usunąć logów');
      }

      await fetchLogs();
    } catch {
      setError('Błąd podczas usuwania logów');
    } finally {
      setDeleting(false);
    }
  };

  const exportLogsToTxt = () => {
    const content = logs
      .map((log) => {
        const config = actionConfig[log.action] || { label: log.action };
        const metadata = parseMetadata(log.metadata);
        let line = `[${formatDate(log.createdAt)}] ${config.label} - ${log.status === 'success' ? 'SUKCES' : 'BŁĄD'}`;
        if (log.ipAddress) line += ` | IP: ${log.ipAddress}`;
        if (metadata?.userEmail) line += ` | Użytkownik: ${metadata.userEmail}`;
        if (metadata?.projectName) line += ` | Projekt: ${metadata.projectName}`;
        if (metadata?.reason) line += ` | Powód: ${metadata.reason}`;
        return line;
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterAction('all');
  };

  const hasActiveFilters =
    filterCategory !== 'all' || filterStatus !== 'all' || filterAction !== 'all';

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Logi Audytu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Logi Audytu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="h-5 w-5 shrink-0" />
              <span className="truncate">Logi Audytu</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm truncate">
              {projectId ? 'Projekt' : 'Wszystkie projekty'}
            </CardDescription>
          </div>

          {/* Akcje */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Odśwież
              </Button>
              {logs.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportLogsToTxt}
                    className="bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Eksport
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleting ? 'Usuwanie...' : 'Wyczyść'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć wszystkie logi?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ta operacja jest nieodwracalna. Wszystkie logi audytu{' '}
                          {projectId ? 'dla tego projektu' : 'ze wszystkich projektów'} zostaną
                          trwale usunięte.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteLogs}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Usuń wszystkie
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>

            {/* Mobile dropdown */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={fetchLogs}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Odśwież
                  </DropdownMenuItem>
                  {logs.length > 0 && (
                    <>
                      <DropdownMenuItem onClick={exportLogsToTxt}>
                        <Download className="h-4 w-4 mr-2" />
                        Eksport do TXT
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {deleting ? 'Usuwanie...' : 'Wyczyść logi'}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usunąć wszystkie logi?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ta operacja jest nieodwracalna.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={deleteLogs}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Usuń wszystkie
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Wyszukiwarka i filtry */}
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Szukaj..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Mobile: przycisk filtrów */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-9 w-9 ${hasActiveFilters ? 'border-primary text-primary' : ''}`}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Kategoria
                      </label>
                      <Select value={filterCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Kategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Status
                      </label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Wszystkie</SelectItem>
                          <SelectItem value="success">Sukces</SelectItem>
                          <SelectItem value="failure">Błąd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Akcja
                      </label>
                      <Select value={filterAction} onValueChange={setFilterAction}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Akcja" />
                        </SelectTrigger>
                        <SelectContent>
                          {filterActions.map((action) => (
                            <SelectItem key={action.value} value={action.value}>
                              {action.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={clearFilters}
                      >
                        Wyczyść filtry
                      </Button>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Desktop: filtry */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-2">
            <Select value={filterCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                {filterCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="success">Sukces</SelectItem>
                <SelectItem value="failure">Błąd</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Akcja" />
              </SelectTrigger>
              <SelectContent>
                {filterActions.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Licznik wyników */}
        {(searchQuery || hasActiveFilters) && (
          <div className="text-xs text-muted-foreground mt-2">
            Znaleziono: {filteredLogs.length} z {logs.length} wpisów
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {logs.length === 0
              ? 'Brak logów do wyświetlenia'
              : 'Brak wyników dla wybranych filtrów'}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <AuditLogItem key={log.id} log={log} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
