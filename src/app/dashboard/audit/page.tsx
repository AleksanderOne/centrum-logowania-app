import { AuditLogsViewer } from '@/components/dashboard/audit-logs-viewer';
import { AuditDictionary } from '@/components/dashboard/audit-dictionary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        <Tabs defaultValue="logs" className="flex flex-col h-full">
          <TabsList className="w-fit mb-4">
            <TabsTrigger value="logs">📋 Logi</TabsTrigger>
            <TabsTrigger value="dictionary">📖 Słowniczek</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="flex-1 min-h-0 mt-0">
            <AuditLogsViewer limit={100} />
          </TabsContent>

          <TabsContent value="dictionary" className="flex-1 min-h-0 mt-0">
            <AuditDictionary />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
