'use client';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateProjectSchema } from '@/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';
import { createProject } from '@/actions/project';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const CreateProjectForm = () => {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<z.infer<typeof CreateProjectSchema>>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      name: '',
      domain: '',
    },
  });

  const onSubmit = (values: z.infer<typeof CreateProjectSchema>) => {
    startTransition(() => {
      createProject(values).then((data) => {
        if (data.error) {
          toast.error(data.error);
        }
        if (data.success) {
          toast.success(data.success);
          form.reset();
          router.refresh(); // Odśwież listę projektów
        }
      });
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 border p-4 rounded-lg bg-card mt-4"
      >
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" suppressHydrationWarning />
          Nowy Projekt
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nazwa Projektu</FormLabel>
                <FormControl>
                  <Input disabled={isPending} placeholder="Moja Aplikacja" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domena / URL</FormLabel>
                <FormControl>
                  <Input disabled={isPending} placeholder="https://moja-aplikacja.pl" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button disabled={isPending} type="submit" className="w-full md:w-auto">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Utwórz Projekt
        </Button>
      </form>
    </Form>
  );
};
