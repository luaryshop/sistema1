import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Unlink, Globe2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Marketplaces() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Queries
  const { data: connections, isLoading, refetch } = trpc.marketplace.getConnections.useQuery();
  const { data: supportedMarketplaces } = trpc.marketplace.getSupportedMarketplaces.useQuery();

  // Mutations
  const authorizationUrlMutation = trpc.marketplace.getAuthorizationUrl.useMutation();
  const disconnectMutation = trpc.marketplace.disconnect.useMutation();

  const handleConnect = async (marketplaceType: string) => {
    try {
      setConnecting(marketplaceType);
      const { authUrl } = await authorizationUrlMutation.mutateAsync({
        marketplaceType: marketplaceType as "mercadolivre" | "shopee" | "amazon" | "tiktok",
      });
      window.location.assign(authUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Falha ao conectar ${marketplaceType}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (marketplaceType: string) => {
    try {
      setDisconnecting(marketplaceType);
      await disconnectMutation.mutateAsync({
        marketplaceType: marketplaceType as any,
      });
      toast.success(`Disconnected from ${marketplaceType}`);
      refetch();
    } catch (error) {
      toast.error(`Failed to disconnect from ${marketplaceType}`);
    } finally {
      setDisconnecting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-slate-500">
        <div className="animate-spin">
          <RefreshCw className="w-8 h-8" />
        </div>
      </div>
    );
  }

  const connectionMap = new Map(connections?.map((c) => [c.marketplaceType, c]) || []);

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/70 md:p-8"><div className="absolute right-[-40px] top-[-70px] h-48 w-48 rounded-full bg-amber-100/70 blur-3xl" /><div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600"><Sparkles className="h-3.5 w-3.5" /> Command Center / Canais</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Integrações de marketplaces</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Conecte seus canais para centralizar produtos, estoque, pedidos e sinais de operação.</p></div><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Globe2 className="h-4 w-4 text-amber-500" /> {connections?.filter((connection) => connection.isConnected).length || 0} conectado(s)</div></div></header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {supportedMarketplaces?.map((marketplace) => {
          const connection = connectionMap.get(marketplace.type);
          const isConnected = connection?.isConnected;

          return (
            <Card key={marketplace.type} className="relative overflow-hidden rounded-3xl border-slate-200/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{marketplace.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {isConnected ? `Conectado como ${connection?.sellerName}` : "Não conectado"}
                    </CardDescription>
                  </div>
                  {isConnected ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-gray-300" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {connection && isConnected && (
                  <div className="space-y-2 rounded-2xl bg-slate-50/70 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última sincronização:</span>
                      <span>
                        {connection.lastSyncAt
                          ? new Date(connection.lastSyncAt).toLocaleString("pt-BR")
                          : "Nunca"}
                      </span>
                    </div>

                    {connection.lastErrorAt && (
                      <div className="flex gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-rose-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Erro na última sincronização</p>
                          <p className="text-xs">{connection.lastErrorMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant={
                          connection.syncStatus === "syncing"
                            ? "default"
                            : connection.syncStatus === "error"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {connection.syncStatus === "syncing" && "Sincronizando..."}
                        {connection.syncStatus === "idle" && "Inativo"}
                        {connection.syncStatus === "error" && "Erro"}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {isConnected ? (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDisconnect(marketplace.type)}
                      disabled={disconnecting === marketplace.type}
                    >
                      {disconnecting === marketplace.type ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Desconectando...
                        </>
                      ) : (
                        <>
                          <Unlink className="w-4 h-4 mr-2" />
                          Desconectar
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      onClick={() => handleConnect(marketplace.type)}
                      disabled={connecting === marketplace.type}
                    >
                      {connecting === marketplace.type ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        "Conectar"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* OAuth Callback Handler */}
      <OAuthCallbackHandler onSuccess={() => refetch()} />
    </div>
  );
}

/**
 * Component to handle OAuth callback from marketplaces
 */
function OAuthCallbackHandler({ onSuccess }: { onSuccess: () => void }) {
  const [processed, setProcessed] = useState(false);
  const handleCallbackMutation = trpc.marketplace.handleOAuthCallback.useMutation();

  useEffect(() => {
    // Check URL for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    // O marketplace de origem vai embutido no próprio "state" (formato "tipo::token"),
    // já que os provedores só devolvem "code" e "state" no redirect.
    const marketplaceType = state?.includes("::") ? state.split("::")[0] : null;

    if (code && state && marketplaceType && !processed) {
      setProcessed(true);

      handleCallbackMutation.mutate(
        {
          code,
          state,
          marketplaceType: marketplaceType as any,
        },
        {
          onSuccess: () => {
            toast.success("Marketplace conectado com sucesso!");
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            onSuccess();
          },
          onError: (error) => {
            toast.error(`Erro ao conectar: ${error.message}`);
            window.history.replaceState({}, document.title, window.location.pathname);
          },
        }
      );
    }
  }, [processed, handleCallbackMutation, onSuccess]);

  return null;
}
