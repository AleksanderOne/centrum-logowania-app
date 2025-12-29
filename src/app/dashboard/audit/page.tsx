import { AuditLogsViewer } from '@/components/dashboard/audit-logs-viewer';
import { AuditDictionary } from '@/components/dashboard/audit-dictionary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuditPage() {
  return (
    <div className="flex flex-col h-full p-4 md:p-8 pt-6">
      <Tabs defaultValue="logs" className="flex flex-col h-full">
        {/* Nagłówek z tabami w jednym wierszu */}
        <div className="flex items-start justify-between gap-4 mb-4 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Logi Audytu</h2>
            <p className="text-muted-foreground text-sm hidden sm:block">
              Historia zdarzeń uwierzytelniania dla Twoich projektów.
            </p>
          </div>
          <TabsList className="shrink-0">
            <TabsTrigger value="logs" className="gap-1">
              <span>📋</span>
              <span className="hidden sm:inline">Logi</span>
            </TabsTrigger>
            <TabsTrigger value="dictionary" className="gap-1">
              <span>📖</span>
              <span className="hidden sm:inline">Słowniczek</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0">
          <TabsContent value="logs" className="h-full mt-0">
            <AuditLogsViewer limit={100} />
          </TabsContent>

          <TabsContent value="dictionary" className="h-full mt-0">
            <AuditDictionary />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
