'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ProjectList } from './project-list';

interface Project {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  apiKey: string | null;
  createdAt: Date | null;
}

interface ProjectsContainerProps {
  projects: Project[];
}

export const ProjectsContainer = ({ projects }: ProjectsContainerProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      (project.domain && project.domain.toLowerCase().includes(query)) ||
      project.slug.toLowerCase().includes(query) ||
      (project.apiKey && project.apiKey.toLowerCase().includes(query))
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar - stała pozycja, widoczna tylko gdy są projekty */}
      {projects.length > 0 && (
        <div className="shrink-0 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj po nazwie, domenie, Client ID lub API Key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Scrollowalna lista projektów */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <ProjectList projects={filteredProjects} totalCount={projects.length} />
      </div>
    </div>
  );
};
