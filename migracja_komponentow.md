# Plan Migracji Komponentów - Atomic Design

## 1. Diagnoza Obecnego Stanu

### Krytyczne Problemy

| Komponent                   | LOC  | Problem                            |
| --------------------------- | ---- | ---------------------------------- |
| `audit-logs-viewer.tsx`     | 1333 | 🔴 KRYTYCZNY - monolityczny moloch |
| `project-members.tsx`       | 388  | 🟠 Duży, duplikacja kodu           |
| `audit-dictionary.tsx`      | 377  | 🟠 Można wydzielić config          |
| `quick-connect-manager.tsx` | 334  | 🟠 Do rozbicia                     |
| `sessions-monitor.tsx`      | 330  | 🟠 Do rozbicia                     |

### Powtarzający się Kod

#### A. Colored Button Pattern (7 wystąpień!)

```tsx
// Ten sam wzór powtarza się dla: amber, cyan, indigo, fuchsia, etc.
className="w-full gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400
           border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50
           hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
```

#### B. CopyButton (2 implementacje)

- `quick-connect-manager.tsx` (linie 30-76)
- `project-list.tsx` (linie 42-67)

#### C. Modal Footer Pattern (3+ wystąpień)

```tsx
<div className="shrink-0 flex flex-row gap-2 justify-between pt-2 border-t mt-2">
  <Button onClick={onRefresh} ...>
  <Button onClick={onClose} ...>
</div>
```

#### D. Dialog + ScrollArea Pattern (3 komponenty)

```tsx
<DialogContent className="sm:max-w-lg max-h-[85vh] ...">
  <DialogHeader className="shrink-0">
  <ScrollArea className="flex-1 min-h-0">
  {/* stopka */}
</DialogContent>
```

---

## 2. Docelowa Struktura (Atomic Design)

```
src/components/
├── atoms/              # Podstawowe elementy UI
│   ├── ColoredButton.tsx
│   ├── CopyButton.tsx
│   ├── StatusIcon.tsx
│   └── StatusBadge.tsx
│
├── molecules/          # Złożone z atoms, reużywalne
│   ├── ModalFooter.tsx
│   ├── ModalContainer.tsx
│   ├── FormattedLogRow.tsx
│   ├── SessionCard.tsx
│   ├── MemberCard.tsx
│   └── QuickConnectCodeItem.tsx
│
├── organisms/          # Duże komponenty (rozbite na mniejsze)
│   ├── audit-logs/
│   │   ├── AuditLogsViewer.tsx
│   │   ├── AuditLogHeader.tsx
│   │   ├── AuditLogFilters.tsx
│   │   └── AuditLogList.tsx
│   ├── QuickConnectManager.tsx
│   ├── SessionsMonitor.tsx
│   └── ProjectMembers.tsx
│
├── templates/          # Layouty stron
│   └── DashboardLayout.tsx
│
└── ui/                 # shadcn/ui (bez zmian)
```

---

## 3. Plan Migracji - Fazy

### FAZA 1: Utworzenie Atoms (1-2h)

#### 1.1 ColoredButton

```tsx
// src/components/atoms/ColoredButton.tsx
interface ColoredButtonProps {
  color: 'amber' | 'cyan' | 'indigo' | 'fuchsia' | 'green' | 'red';
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
  disabled?: boolean;
}
```

Pliki do aktualizacji:

- `quick-connect-manager.tsx`
- `sessions-monitor.tsx`
- `project-members.tsx`
- `integration-tester.tsx`

#### 1.2 CopyButton

```tsx
// src/components/atoms/CopyButton.tsx
interface CopyButtonProps {
  text: string;
  label?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}
```

Pliki do aktualizacji:

- `quick-connect-manager.tsx` (usunąć lokalną implementację)
- `project-list.tsx` (usunąć lokalną implementację)

#### 1.3 StatusIcon + StatusBadge

```tsx
// src/components/atoms/StatusIcon.tsx
interface StatusIconProps {
  status: 'success' | 'error' | 'warning' | 'pending' | 'skipped';
  size?: 'sm' | 'md' | 'lg';
}
```

Pliki do aktualizacji:

- `integration-tester.tsx` (usunąć lokalną definicję)
- `audit-logs-viewer.tsx` (zastąpić inline logikę)

---

### FAZA 2: Utworzenie Molecules (2-3h)

#### 2.1 ModalFooter

```tsx
// src/components/molecules/ModalFooter.tsx
interface ModalFooterProps {
  onClose: () => void;
  onRefresh?: () => void;
  refreshLabel?: string;
  closeLabel?: string;
  isPending?: boolean;
}
```

#### 2.2 ModalContainer

```tsx
// src/components/molecules/ModalContainer.tsx
interface ModalContainerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}
```

#### 2.3 FormattedLogRow

```tsx
// src/components/molecules/FormattedLogRow.tsx
interface FormattedLogRowProps {
  log: AuditLog;
  actionConfig: ActionConfig;
  isInternal?: boolean;
  onExpand?: () => void;
}
```

#### 2.4 SessionCard

```tsx
// src/components/molecules/SessionCard.tsx
interface SessionCardProps {
  session: Session;
  onRevoke?: (sessionId: string) => void;
  isRevoking?: boolean;
}
```

---

### FAZA 3: Rozbicie Organisms (3-4h)

#### 3.1 AuditLogsViewer (PRIORYTET!)

Obecne 1333 LOC → Docelowe ~400 LOC (główny komponent)

Wydzielić:

1. `AuditLogHeader.tsx` (~150 LOC) - tytuł, statystyki, główne akcje
2. `AuditLogFilters.tsx` (~200 LOC) - wszystkie filtry, search
3. `AuditLogList.tsx` (~300 LOC) - lista z FormattedLogRow
4. `audit-config.ts` (~200 LOC) - actionConfig, categoryConfig

```
src/components/organisms/audit-logs/
├── index.ts
├── AuditLogsViewer.tsx      (orchestration + state)
├── AuditLogHeader.tsx
├── AuditLogFilters.tsx
├── AuditLogList.tsx
└── audit-config.ts
```

#### 3.2 QuickConnectManager

Obecne 334 LOC → Docelowe ~180 LOC

Wydzielić:

1. `QuickConnectCodeItem.tsx` (~70 LOC) - pojedynczy kod

#### 3.3 SessionsMonitor

Obecne 330 LOC → Docelowe ~160 LOC

Wydzielić:

1. Użyć `SessionCard` z molecules

#### 3.4 ProjectMembers

Obecne 388 LOC → Docelowe ~220 LOC

Wydzielić:

1. `MemberCard.tsx` (~60 LOC)
2. Zunifikować zduplikowany przycisk widoczności (mobile vs desktop)

---

### FAZA 4: Konsolidacja CSS (1-2h)

#### 4.1 Color Config

```typescript
// src/lib/color-schemes.ts
export const colorSchemes = {
  amber: {
    bg: 'bg-amber-500/10',
    bgHover: 'hover:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    borderHover: 'hover:border-amber-500/50',
  },
  // ... pozostałe kolory
} as const;

export type ColorScheme = keyof typeof colorSchemes;
```

#### 4.2 Animation Classes

```typescript
// src/lib/animation-classes.ts
export const animations = {
  scaleOnHover: 'hover:scale-[1.02] active:scale-[0.98] transition-all duration-150',
  fadeIn: 'animate-in fade-in duration-200',
  slideIn: 'animate-in slide-in-from-bottom-2 duration-200',
} as const;
```

#### 4.3 Tailwind Config (opcjonalnie)

```javascript
// tailwind.config.js - extend
{
  extend: {
    animation: {
      'scale-click': 'scale-click 150ms ease-out',
    }
  }
}
```

---

## 4. Kolejność Implementacji

### Sprint 1: Fundamenty (4-5h)

1. ✅ Utworzyć folder `src/components/atoms/`
2. ✅ Utworzyć folder `src/components/molecules/`
3. ✅ Przenieść/utworzyć `ColoredButton`
4. ✅ Przenieść/utworzyć `CopyButton`
5. ✅ Utworzyć `ModalFooter`
6. ✅ Utworzyć `ModalContainer`

### Sprint 2: Quick Wins (2-3h)

1. ✅ Zaktualizować `quick-connect-manager.tsx` (użyć nowych atoms)
2. ✅ Zaktualizować `sessions-monitor.tsx`
3. ✅ Zaktualizować `project-members.tsx`
4. ✅ Zaktualizować `project-list.tsx`

### Sprint 3: Główny Refactor (3-4h)

1. ✅ Rozbić `audit-logs-viewer.tsx` na 4 pliki
2. ✅ Utworzyć `audit-config.ts`
3. ✅ Testy - sprawdzić czy wszystko działa

### Sprint 4: Finalizacja (1-2h)

1. ✅ Konsolidacja CSS (color-schemes.ts, animation-classes.ts)
2. ✅ Aktualizacja importów w całym projekcie
3. ✅ Usunięcie martwego kodu

---

## 5. Szacowane Oszczędności

| Metryka                   | Przed    | Po      | Oszczędność |
| ------------------------- | -------- | ------- | ----------- |
| LOC w dashboard/          | ~3800    | ~2200   | 42%         |
| Duplikacja kodu           | ~400 LOC | ~50 LOC | 87%         |
| Reużywalne komponenty     | 0        | 12      | +12         |
| Średni rozmiar komponentu | 380 LOC  | 180 LOC | 53%         |

---

## 6. Ryzyka i Mitygacja

| Ryzyko            | Prawdopodobieństwo | Mitygacja                                   |
| ----------------- | ------------------ | ------------------------------------------- |
| Regresje wizualne | Średnie            | Testować każdy komponent po wydzieleniu     |
| Błędne importy    | Niskie             | IDE autoimport + TypeScript                 |
| Merge conflicts   | Średnie            | Robić PR dla każdej fazy osobno             |
| Props drilling    | Niskie             | Używać Context tylko gdy naprawdę potrzebny |

---

## 7. Checklist Przed Każdą Zmianą

- [ ] Komponent działa w trybie light i dark
- [ ] Responsywność: mobile, tablet, desktop
- [ ] TypeScript - brak błędów
- [ ] Props są dobrze otypowane
- [ ] Nie ma inline styles (className zamiast style={})
- [ ] Używa `cn()` do łączenia klas

---

## 8. Przykład Migracji - CopyButton

### PRZED (w quick-connect-manager.tsx):

```tsx
// Lokalna funkcja, ~47 linii
function CopyButton({ text, label = 'Kopiuj', fullWidth = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  // ... cała implementacja
}
```

### PO:

```tsx
// src/components/atoms/CopyButton.tsx
import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  label?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'ghost';
}

export function CopyButton({
  text,
  label = 'Kopiuj',
  fullWidth = false,
  size = 'sm',
  variant = 'outline',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn(fullWidth && 'w-full')}
    >
      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
      {copied ? 'Skopiowano!' : label}
    </Button>
  );
}
```

### Użycie w projekcie:

```tsx
import { CopyButton } from '@/components/atoms/CopyButton';

// W quick-connect-manager.tsx
<CopyButton text={code.value} label="Kopiuj kod" fullWidth />

// W project-list.tsx
<CopyButton text={project.clientId} size="sm" />
```

---

## Następne Kroki

1. **Decyzja**: Czy robimy migrację inkrementalnie (bezpieczniej) czy "big bang" (szybciej)?
2. **Priorytet**: Zacząć od `audit-logs-viewer.tsx` (największy zysk) czy od atoms (fundamenty)?
3. **Timeline**: Proponuję 2-3 sesje po 2-3h każda

---

_Dokument utworzony: 2025-12-30_
