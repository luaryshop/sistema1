import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unlink,
  Globe2,
  Sparkles,
  Search,
  Download,
  Eye,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

type MarketplaceType = "mercadolivre" | "shopee" | "amazon" | "tiktok";

type ListingPreview = {
  listingId: string;
  title: string;
  description?: string;
  sku?: string;
  price?: number;
  stock?: number;
  status?: string;
  images?: string[];
};

const marketplaceTypes: MarketplaceType[] = ["mercadolivre", "shopee", "amazon", "tiktok"];

function formatMoneyInCents(value?: number) {
  if (value === undefined || value === null) return "—";
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusLabel(status?: string) {
  if (status === "paused") return "Pausado";
  if (status === "active") return "Ativo";
  if (status === "inactive") return "Inativo";
  return status || "—";
}

export default function Marketplaces() {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [previewMarketplace, setPreviewMarketplace] = useState<string | null>(null);
  const [previewListings, setPreviewListings] = useState<ListingPreview[]>([]);

  const { data: connections, isLoading, refetch } = trpc.marketplace.getConnections.useQuery();
  const { data: supportedMarketplaces } = trpc.marketplace.getSupportedMarketplaces.useQuery();

  const authorizationUrlMutation = trpc.marketplace.getAuthorizationUrl.useMutation();
  const disconnectMutation = trpc.marketplace.disconnect.useMutation();
  const previewListingsQuery = trpc.marketplace.previewListings.useQuery(
    { marketplaceType: "mercadolivre", status: "paused", limit: 100 },
    { enabled: false },
  );
  const stageListingsMutation = trpc.marketplace.stageListings.useMutation();

  const handleConnect = async (marketplaceType: string) => {
    try {
      setConnecting(marketplaceType);
      const { authUrl } = await authorizationUrlMutation.mutateAsync({
        marketplaceType: marketplaceType as MarketplaceType,
      });
      window.location.assign(authUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Falha ao conectar ${marketplaceType}`);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (marketplaceType: string) => {
    try {
      setDisconnecting(marketplaceType);
      await disconnectMutation.mutateAsync({
        marketplaceType: marketplaceType as MarketplaceType,
      });
      toast.success("Marketplace desconectado.");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao desconectar o marketplace.");
    } finally {
      setDisconnecting(null);
    }
  };

  const handlePreviewPausedListings = async (marketplaceType: string) => {
    try {
      setPreviewMarketplace(marketplaceType);
      if (marketplaceType !== "mercadolivre") {
        throw new Error("A consulta de anúncios está disponível para o Mercado Livre nesta etapa.");
      }
      const result = await previewListingsQuery.refetch();
      const listings = result.data ?? [];
      setPreviewListings(listings as ListingPreview[]);
      toast.success(`${listings.length} anúncio(s) pausado(s) encontrado(s).`);
    } catch (error) {
      setPreviewMarketplace(null);
      toast.error(error instanceof Error ? error.message : "Não foi possível consultar os anúncios pausados.");
    }
  };

  const handleStagePausedListings = async (marketplaceType: string) => {
    try {
      setPreviewMarketplace(marketplaceType);
      const result = await stageListingsMutation.mutateAsync({
        marketplaceType: marketplaceType as MarketplaceType,
        status: "paused",
        limit: 100,
      });
      toast.success(`${result.staged} anúncio(s) enviado(s) para revisão no Luary.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar os anúncios pausados.");
    } finally {
      setPreviewMarketplace(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const connectionMap = new Map(connections?.map((connection) => [connection.marketplaceType, connection]) || []);

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/70 md:p-8">
        <div className="absolute right-[-40px] top-[-70px] h-48 w-48 rounded-full bg-amber-100/70 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600">
              <Sparkles className="h-3.5 w-3.5" /> Command Center / Canais
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Integrações de marketplaces</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Conecte seus canais para centralizar produtos, estoque, pedidos e sinais de operação.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Globe2 className="h-4 w-4 text-amber-500" />
            {connections?.filter((connection) => connection.isConnected).length || 0} conectado(s)
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <strong>Modo seguro ativo:</strong> a consulta e a importação para revisão não publicam, ativam, pausam,
        editam preço/estoque nem excluem anúncios nos marketplaces.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {supportedMarketplaces?.map((marketplace) => {
          const connection = connectionMap.get(marketplace.type);
          const isConnected = connection?.isConnected;
          const isMercadoLivre = marketplace.type === "mercadolivre";
          const isImporting = stageListingsMutation.isPending && previewMarketplace === marketplace.type;
          const isPreviewing = previewListingsQuery.isFetching && previewMarketplace === marketplace.type;

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
                  {isConnected ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-gray-300" />}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {connection && isConnected && (
                  <div className="space-y-2 rounded-2xl bg-slate-50/70 p-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Última sincronização:</span>
                      <span>{connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString("pt-BR") : "Nunca"}</span>
                    </div>

                    {connection.lastErrorAt && (
                      <div className="flex gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-rose-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="font-medium">Erro na última sincronização</p>
                          <p className="text-xs">{connection.lastErrorMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={connection.syncStatus === "error" ? "destructive" : "secondary"}>
                        {connection.syncStatus === "syncing" ? "Sincronizando..." : connection.syncStatus === "error" ? "Erro" : "Pronto para consultar"}
                      </Badge>
                    </div>
                  </div>
                )}

                {isConnected && isMercadoLivre && (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Importar anúncios pausados</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Consulte os anúncios do Mercado Livre e envie uma cópia para revisão e vinculação aos Produtos Mestres.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        onClick={() => handlePreviewPausedListings(marketplace.type)}
                        disabled={isPreviewing || isImporting}
                      >
                        {isPreviewing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        {isPreviewing ? "Consultando..." : "Consultar pausados"}
                      </Button>
                      <Button onClick={() => handleStagePausedListings(marketplace.type)} disabled={isPreviewing || isImporting}>
                        {isImporting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isImporting ? "Importando..." : "Importar para revisão"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {isConnected ? (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDisconnect(marketplace.type)}
                      disabled={disconnecting === marketplace.type || isPreviewing || isImporting}
                    >
                      {disconnecting === marketplace.type ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                      {disconnecting === marketplace.type ? "Desconectando..." : "Desconectar"}
                    </Button>
                  ) : (
                    <Button className="flex-1" onClick={() => handleConnect(marketplace.type)} disabled={connecting === marketplace.type}>
                      {connecting === marketplace.type ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {connecting === marketplace.type ? "Conectando..." : "Conectar"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {previewMarketplace === "mercadolivre" && !previewListingsQuery.isFetching && previewListings.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600">Pré-visualização</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Anúncios pausados encontrados</h2>
              <p className="mt-1 text-sm text-slate-500">{previewListings.length} anúncio(s) retornado(s) pelo Mercado Livre.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setPreviewMarketplace(null)} aria-label="Fechar pré-visualização">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-3 font-semibold">Anúncio</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Preço</th>
                  <th className="px-3 py-3 font-semibold">Estoque</th>
                  <th className="px-3 py-3 font-semibold">Imagens</th>
                  <th className="px-3 py-3 font-semibold">ID</th>
                </tr>
              </thead>
              <tbody>
                {previewListings.map((listing) => (
                  <tr key={listing.listingId} className="border-b border-slate-50 last:border-0">
                    <td className="max-w-[320px] px-3 py-4">
                      <p className="truncate font-medium text-slate-900" title={listing.title}>{listing.title || "Sem título"}</p>
                      {listing.sku && <p className="mt-1 text-xs text-slate-400">SKU: {listing.sku}</p>}
                    </td>
                    <td className="px-3 py-4"><Badge variant="secondary">{statusLabel(listing.status)}</Badge></td>
                    <td className="px-3 py-4 text-slate-600">{formatMoneyInCents(listing.price)}</td>
                    <td className="px-3 py-4 text-slate-600">{listing.stock ?? "—"}</td>
                    <td className="px-3 py-4 text-slate-600"><span className="inline-flex items-center gap-1"><ImageIcon className="h-4 w-4" />{listing.images?.length ?? 0}</span></td>
                    <td className="px-3 py-4 font-mono text-xs text-slate-500">{listing.listingId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
            <Eye className="mt-0.5 h-4 w-4 shrink-0" />
            Esta é apenas uma consulta. Os anúncios permanecem pausados e inalterados no Mercado Livre.
          </div>
        </section>
      )}

      <OAuthCallbackHandler onSuccess={() => refetch()} />
    </div>
  );
}

function OAuthCallbackHandler({ onSuccess }: { onSuccess: () => void }) {
  const [processed, setProcessed] = useState(false);
  const handleCallbackMutation = trpc.marketplace.handleOAuthCallback.useMutation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const shopId = params.get("shop_id") ?? undefined;
    const mainAccountId = params.get("main_account_id") ?? undefined;
    const mktMarker = params.get("mkt");
    const marketplaceType = state?.includes("::")
      ? state.split("::")[0]
      : mktMarker === "tiktok"
        ? "tiktok"
        : null;
    const effectiveState = state ?? (marketplaceType === "tiktok" ? "tiktok::sem-state" : null);

    if (code && effectiveState && marketplaceType && !processed) {
      setProcessed(true);
      handleCallbackMutation.mutate(
        {
          code,
          state: effectiveState,
          shopId,
          mainAccountId,
          marketplaceType: marketplaceType as MarketplaceType,
        },
        {
          onSuccess: () => {
            toast.success("Marketplace conectado com sucesso!");
            window.history.replaceState({}, document.title, window.location.pathname);
            onSuccess();
          },
          onError: (error) => {
            toast.error(`Erro ao conectar: ${error.message}`);
            window.history.replaceState({}, document.title, window.location.pathname);
          },
        },
      );
    }
  }, [processed, handleCallbackMutation, onSuccess]);

  return null;
}
