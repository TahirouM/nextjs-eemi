import { Card, Skeleton } from "@/components/ui";

/**
 * `loading.tsx` : Next.js l'affiche automatiquement pendant le chargement de
 * la page du même dossier. C'est un <Suspense> implicite posé sur la route.
 */
export default function SessionsLoading() {
  return (
    <>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-96 max-w-full" />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>

      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-4">
            <div className="flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-64 max-w-full" />
              <Skeleton className="mt-1 h-4 w-40" />
            </div>
            <Skeleton className="h-9 w-24" />
          </Card>
        ))}
      </div>
    </>
  );
}
