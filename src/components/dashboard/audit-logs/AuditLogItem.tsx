'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Eye, EyeOff, Shield } from 'lucide-react';
import { ClaLogo } from '@/components/cla-logo';
import {
  actionConfig,
  INTERNAL_ACTIONS,
  formatDate,
  parseMetadata,
  extractDomain,
  type AuditLog,
  type IntegrationLogResults,
} from './audit-config';

interface AuditLogItemProps {
  log: AuditLog;
}

export function AuditLogItem({ log }: AuditLogItemProps) {
  const config = actionConfig[log.action] || {
    icon: Shield,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10 border-gray-500/30',
    label: log.action,
  };
  const Icon = config.icon;
  const metadata = parseMetadata(log.metadata);
  const isInternal = INTERNAL_ACTIONS.has(log.action);

  // Renderowanie pola publiczności
  const renderVisibilityStatus = () => {
    if (metadata?.isPublic === undefined && metadata?.IsPublic === undefined) return null;
    const isPublic =
      metadata.isPublic === true ||
      metadata.IsPublic === true ||
      metadata.isPublic === 'true' ||
      metadata.IsPublic === 'true';

    return isPublic ? (
      <div className="flex items-center gap-0.5 font-bold text-green-600 dark:text-green-400">
        <Eye className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" /> Publiczny
      </div>
    ) : (
      <div className="flex items-center gap-0.5 font-bold text-slate-600 dark:text-slate-400">
        <EyeOff className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" /> Prywatny
      </div>
    );
  };

  // Renderowanie pozostałych pól metadata
  const renderExtraMetadata = () => {
    if (!metadata) return null;
    const skipKeys = [
      'redirectUri',
      'projectName',
      'userEmail',
      'reason',
      'results',
      'isPublic',
      'IsPublic',
    ];

    return Object.entries(metadata).map(([key, value]) => {
      if (skipKeys.includes(key)) return null;
      if (typeof value === 'object') return null;
      return (
        <div key={key} className="flex items-center gap-2">
          <span className="text-muted-foreground font-semibold capitalize">{key}:</span>
          <span className="text-foreground font-medium truncate max-w-[300px]">
            {String(value)}
          </span>
        </div>
      );
    });
  };

  return (
    <div
      className={`p-2 sm:p-4 rounded-lg sm:rounded-xl border-2 border-l-4 sm:border-l-[6px] ${config.bgColor} shadow-sm hover:shadow-md transition-all duration-200`}
    >
      {/* ============ MOBILE LAYOUT (< sm) ============ */}
      <div className="sm:hidden">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
          <span className={`text-xs font-bold tracking-tight ${config.color} truncate flex-1`}>
            {config.label}
          </span>
          {isInternal && (
            <div title="CLA">
              <ClaLogo size={12} className="opacity-80 shrink-0" />
            </div>
          )}
        </div>

        <div className="text-[10px] font-medium text-foreground/90 bg-background/40 p-1.5 rounded">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {log.ipAddress && (
              <div>
                <span className="text-muted-foreground uppercase text-[8px]">IP</span>
                <div className="font-mono font-bold truncate">{log.ipAddress}</div>
              </div>
            )}
            {metadata?.projectName && (
              <div>
                <span className="text-muted-foreground uppercase text-[8px]">Projekt</span>
                <div className="font-bold uppercase truncate">{metadata.projectName}</div>
              </div>
            )}
            {metadata?.redirectUri && (
              <div className="col-span-2">
                <span className="text-muted-foreground uppercase text-[8px]">Witryna</span>
                <div className="font-mono font-bold truncate">
                  {extractDomain(metadata.redirectUri)}
                </div>
              </div>
            )}
            {metadata?.userEmail && (
              <div className="col-span-2">
                <span className="text-muted-foreground uppercase text-[8px]">User</span>
                <div className="font-semibold truncate">{metadata.userEmail}</div>
              </div>
            )}
            {(metadata?.isPublic !== undefined || metadata?.IsPublic !== undefined) && (
              <div>
                <span className="text-muted-foreground uppercase text-[8px]">Status</span>
                {renderVisibilityStatus()}
              </div>
            )}
            {log.action === 'integration_test' && metadata?.results && (
              <div className="col-span-2">
                <span className="text-muted-foreground uppercase text-[8px]">Wynik</span>
                <div className="font-semibold truncate">
                  {(metadata.results as IntegrationLogResults).integration?.message}
                </div>
              </div>
            )}
            {metadata?.reason && (
              <div className="col-span-2 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 px-1 py-0.5 rounded">
                <span className="uppercase text-[8px] opacity-80">Powód</span>
                <div className="font-bold truncate">{metadata.reason}</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 pt-1.5 mt-1.5 border-t border-border/20 text-[9px]">
            <Badge
              variant="outline"
              className="font-mono text-[8px] text-foreground/60 px-1 py-0 h-4"
            >
              {log.action}
            </Badge>
            {log.status === 'success' ? (
              <span className="text-green-600 font-bold flex items-center gap-0.5">
                <CheckCircle className="h-2.5 w-2.5" />
                OK
              </span>
            ) : (
              <span className="text-red-600 font-bold flex items-center gap-0.5">
                <XCircle className="h-2.5 w-2.5" />
                ERR
              </span>
            )}
            <span className="text-muted-foreground">{formatDate(log.createdAt).split(' ')[0]}</span>
            <span className="text-muted-foreground">{formatDate(log.createdAt).split(' ')[1]}</span>
          </div>
        </div>
      </div>

      {/* ============ TABLET LAYOUT (sm - lg) ============ */}
      <div className="hidden sm:block lg:hidden">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-6 w-6 shrink-0 ${config.color}`} />
          <span className={`text-base font-bold tracking-tight ${config.color} truncate flex-1`}>
            {config.label}
          </span>
          {isInternal && (
            <div title="Akcja wewnętrzna CLA">
              <ClaLogo size={16} className="opacity-80 shrink-0" />
            </div>
          )}
        </div>

        <div className="text-sm font-medium text-foreground/90 space-y-1.5 bg-background/40 p-2 rounded-md mb-2">
          {log.ipAddress && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">IP:</span>
              <span className="font-mono text-foreground font-bold">{log.ipAddress}</span>
            </div>
          )}
          {metadata && Object.keys(metadata).length > 0 && (
            <>
              {log.action === 'integration_test' && metadata.results && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">Wynik:</span>
                  <span className="font-semibold">
                    {(metadata.results as IntegrationLogResults).integration?.message}
                  </span>
                </div>
              )}
              {(metadata.isPublic !== undefined || metadata.IsPublic !== undefined) && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">Status:</span>
                  {renderVisibilityStatus()}
                </div>
              )}
              {metadata.redirectUri && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-semibold shrink-0">Witryna:</span>
                  <span className="font-mono text-foreground font-bold break-all">
                    {extractDomain(metadata.redirectUri)}
                  </span>
                </div>
              )}
              {metadata.projectName && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">Projekt:</span>
                  <span className="text-foreground font-bold uppercase tracking-wide bg-background/60 px-1.5 py-0.5 rounded border border-border/20 text-xs">
                    {metadata.projectName}
                  </span>
                </div>
              )}
              {metadata.userEmail && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">User:</span>
                  <span className="font-semibold text-foreground break-all">
                    {metadata.userEmail}
                  </span>
                </div>
              )}
              {metadata.reason && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded">
                  <span>Powód:</span>
                  <span className="break-all">{metadata.reason}</span>
                </div>
              )}
              {renderExtraMetadata()}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mb-1">
          {log.status === 'success' ? (
            <Badge className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 py-0.5 font-bold shadow-sm uppercase tracking-wider">
              <CheckCircle className="h-3 w-3 mr-1" />
              SUKCES
            </Badge>
          ) : (
            <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 font-bold shadow-sm uppercase tracking-wider">
              <XCircle className="h-3 w-3 mr-1" />
              BŁĄD
            </Badge>
          )}
          <Badge
            variant="outline"
            className="font-mono text-xs text-foreground/90 font-bold bg-background/60 py-1"
          >
            {log.action}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="font-bold text-foreground">
            {formatDate(log.createdAt).split(' ')[0]}
          </span>
          <span className="font-semibold">{formatDate(log.createdAt).split(' ')[1]}</span>
        </div>
      </div>

      {/* ============ DESKTOP LAYOUT (>= lg) ============ */}
      <div className="hidden lg:flex lg:flex-row lg:items-stretch lg:gap-4">
        <div className="flex flex-col justify-center items-center shrink-0">
          <Icon className={`h-8 w-8 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`text-lg md:text-xl font-extrabold tracking-tight ${config.color} drop-shadow-sm`}
            >
              {config.label}
            </span>
            {isInternal && (
              <div title="Akcja wewnętrzna Centrum Logowania">
                <ClaLogo size={18} className="opacity-100" />
              </div>
            )}
          </div>

          <div className="text-sm font-medium text-foreground/90 space-y-1.5 bg-background/40 p-2 rounded-md">
            {log.ipAddress && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-semibold">IP:</span>
                <span className="font-mono text-foreground font-bold">{log.ipAddress}</span>
              </div>
            )}
            {metadata && Object.keys(metadata).length > 0 && (
              <>
                {log.action === 'integration_test' && metadata.results && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-semibold">Wynik:</span>
                    <span className="font-semibold">
                      {(metadata.results as IntegrationLogResults).integration?.message}
                    </span>
                  </div>
                )}
                {(metadata.isPublic !== undefined || metadata.IsPublic !== undefined) && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-semibold">Status:</span>
                    {renderVisibilityStatus()}
                  </div>
                )}
                {metadata.redirectUri && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground font-semibold shrink-0">Witryna:</span>
                    <span className="font-mono text-foreground font-bold break-all">
                      {extractDomain(metadata.redirectUri)}
                    </span>
                  </div>
                )}
                {metadata.projectName && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-semibold">Projekt:</span>
                    <span className="text-foreground font-bold uppercase tracking-wide bg-background/60 px-1.5 py-0.5 rounded border border-border/20 text-xs">
                      {metadata.projectName}
                    </span>
                  </div>
                )}
                {metadata.userEmail && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-semibold">User:</span>
                    <span className="font-semibold text-foreground break-all">
                      {metadata.userEmail}
                    </span>
                  </div>
                )}
                {metadata.reason && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-900/20 px-2 py-1 rounded">
                    <span>Powód:</span>
                    <span className="break-all">{metadata.reason}</span>
                  </div>
                )}
                {renderExtraMetadata()}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end justify-between pl-4 ml-auto min-w-[140px] shrink-0 border-l border-border/10">
          <div className="flex flex-col items-end gap-2 w-full">
            {log.status === 'success' ? (
              <Badge className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 py-0.5 justify-center font-bold shadow-sm uppercase tracking-wider">
                <CheckCircle className="h-3 w-3 mr-1" />
                SUKCES
              </Badge>
            ) : (
              <Badge className="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 justify-center font-bold shadow-sm uppercase tracking-wider">
                <XCircle className="h-3 w-3 mr-1" />
                BŁĄD
              </Badge>
            )}
            <Badge
              variant="outline"
              className="font-mono text-xs justify-center text-foreground/90 font-bold bg-background/60 py-1 w-full"
            >
              {log.action}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground">
              {formatDate(log.createdAt).split(' ')[0]}
            </div>
            <div className="text-xs font-semibold text-muted-foreground">
              {formatDate(log.createdAt).split(' ')[1]}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
