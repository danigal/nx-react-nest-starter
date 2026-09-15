import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useReadiness } from '@/hooks/use-readiness';
import { useTheme, type Theme } from '@/lib/theme';

const themeOptions: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export function Home() {
  const readiness = useReadiness();
  const { theme, setTheme } = useTheme();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-5 py-12">
      <header className="space-y-3">
        <p className="text-sm font-medium text-primary">
          Production-oriented foundation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Nx React + Nest starter
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          A strict, same-origin monorepo with a static React client,
          Fastify-powered Nest API, checked-in database migrations, and shared
          runtime contracts.
        </p>
      </header>

      <Card aria-live="polite">
        <CardHeader>
          <CardTitle>API readiness</CardTitle>
          <CardDescription>
            The API verifies its PostgreSQL connection before reporting ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-20">
          {readiness.isPending && (
            <div
              className="flex items-center gap-3 text-muted-foreground"
              role="status"
            >
              <LoaderCircle className="size-5 animate-spin" /> Checking the API…
            </div>
          )}
          {readiness.isSuccess && (
            <div className="flex items-center gap-3 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" /> Ready
            </div>
          )}
          {readiness.isError && (
            <div className="flex flex-wrap items-center gap-3">
              <CircleAlert className="size-5 text-amber-600" />
              <span className="mr-auto">Unavailable</span>
              <Button size="sm" onClick={() => void readiness.refetch()}>
                Try again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section
        aria-labelledby="theme-label"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <span id="theme-label" className="text-sm text-muted-foreground">
          Appearance
        </span>
        <div
          className="flex rounded-lg border bg-card p-1"
          role="group"
          aria-label="Appearance"
        >
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              size="sm"
              variant={theme === value ? 'secondary' : 'ghost'}
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
            >
              <Icon data-icon="inline-start" /> {label}
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
