import { AuditLogsViewer } from '@/components/dashboard/audit-logs-viewer';

export default function AuditPage() {
  return (
    <div className="flex flex-col h-full p-4 md:p-8 pt-6">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold tracking-tight">Logi Audytu</h2>
        <p className="text-muted-foreground">
          Historia zdarzeń uwierzytelniania dla Twoich projektów.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <AuditLogsViewer limit={100} />
      </div>
    </div>
  );
}
