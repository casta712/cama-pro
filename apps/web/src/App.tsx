import { useQuery } from "@tanstack/react-query";

type HealthResponse = { status: string; timestamp: string };

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`API respondio ${res.status}`);
  return res.json();
}

export function App() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <main className="min-h-full flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h1 className="text-2xl font-semibold mb-2">Cama-Pro</h1>
        <p className="text-slate-600 mb-6 text-sm">
          Plataforma de gestion de camareros para restaurantes y casas de eventos.
        </p>

        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm">
          <div className="font-medium mb-1">Estado API</div>
          {isLoading && <div className="text-slate-500">comprobando...</div>}
          {isError && (
            <div className="text-red-600">
              no responde ({(error as Error).message})
            </div>
          )}
          {data && (
            <div className="text-emerald-700">
              {data.status} — {new Date(data.timestamp).toLocaleString("es-ES")}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
