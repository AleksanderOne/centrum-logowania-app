import { CreateProjectForm } from '@/components/dashboard/create-project-form';

export default function NewProjectPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-8 pt-6 pb-4 shrink-0 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nowy Projekt</h2>
          <p className="text-muted-foreground">
            Utwórz nową aplikację podłączoną do Centrum Logowania.
          </p>
        </div>
        <CreateProjectForm />
      </div>
    </div>
  );
}
