import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Boxes, ImagePlus, RefreshCw, Sparkles } from "lucide-react";

export default function Omnichannel() {
  const { data: products = [], isLoading: productsLoading } = trpc.products.list.useQuery();
  const [selectedProductId, setSelectedProductId] = useState<number | undefined>();
  const activeProductId = selectedProductId ?? products[0]?.id;
  const { data: media = [], refetch: refetchMedia } = trpc.omnichannel.listMedia.useQuery(
    { productId: activeProductId ?? 0 },
    { enabled: Boolean(activeProductId) },
  );
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"image" | "video">("image");
  const [altText, setAltText] = useState("");
  const [marketplaceType, setMarketplaceType] = useState<"mercadolivre" | "shopee">("mercadolivre");
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const { data: jobs = [] } = trpc.omnichannel.listJobs.useQuery({ limit: 20 });
  const { data: stagedListings = [], refetch: refetchStaged } = trpc.marketplace.listStagedListings.useQuery({ status: "all" });
  const { data: listings = [], isFetching: listingsLoading } = trpc.marketplace.previewListings.useQuery(
    { marketplaceType, status: "all", limit: 50 },
    { enabled: previewEnabled },
  );
  const addMedia = trpc.omnichannel.addMedia.useMutation({
    onSuccess: () => { setUrl(""); setAltText(""); refetchMedia(); toast.success("Mídia adicionada à biblioteca"); },
    onError: (error) => toast.error(error.message),
  });
  const enqueue = trpc.omnichannel.enqueueSync.useMutation({
    onSuccess: (result) => toast.success(result.duplicate ? "Este job já estava na fila" : "Sincronização adicionada à fila"),
    onError: (error) => toast.error(error.message),
  });
  const processJobs = trpc.omnichannel.processPendingJobs.useMutation({
    onSuccess: (result) => toast.success(`${result.processed} job(s) processado(s)`),
    onError: (error) => toast.error(error.message),
  });
  const linkListing = trpc.marketplace.linkListing.useMutation({
    onSuccess: (result) => toast.success(result.action === "linked" ? "Anúncio vinculado ao catálogo" : "Vínculo atualizado"),
    onError: (error) => toast.error(error.message),
  });
  const stageListings = trpc.marketplace.stageListings.useMutation({
    onSuccess: (result) => { toast.success(`${result.staged} anúncio(s) enviado(s) para staging`); refetchStaged(); },
    onError: (error) => toast.error(error.message),
  });
  const analyzeMatch = trpc.marketplace.analyzeStagedMatch.useMutation({
    onSuccess: () => { toast.success("Matching recalculado"); refetchStaged(); },
    onError: (error) => toast.error(error.message),
  });
  const linkStaged = trpc.marketplace.linkStagedListing.useMutation({
    onSuccess: () => { toast.success("Oferta vinculada ao Produto Mestre; anúncio externo preservado"); refetchStaged(); },
    onError: (error) => toast.error(error.message),
  });
  const reviewStaged = trpc.marketplace.reviewStagedListing.useMutation({
    onSuccess: () => { toast.success("Anúncio marcado para revisão concluída"); refetchStaged(); },
    onError: (error) => toast.error(error.message),
  });
  const ignoreStaged = trpc.marketplace.ignoreStagedListing.useMutation({
    onSuccess: () => { toast.success("Anúncio ignorado no staging; nada foi alterado externamente"); refetchStaged(); },
    onError: (error) => toast.error(error.message),
  });
  const selectedProduct = useMemo(() => products.find((product) => product.id === activeProductId), [products, activeProductId]);

  if (productsLoading) return <div className="container py-8">Carregando catálogo...</div>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200/70 md:p-8">
        <div className="absolute right-[-30px] top-[-50px] h-40 w-40 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600"><Sparkles className="h-3.5 w-3.5" /> Command Center / Canais</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Catálogo, mídia e sincronização</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Prepare o produto mestre antes de publicar. Cada mudança fica registrada, deduplicada e pronta para a homologação dos canais.</p></div><div className="flex items-center gap-2 text-xs font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Núcleo interno protegido</div></div>
      </header>

      <Card className="rounded-3xl border-slate-200/80 shadow-sm">
        <CardHeader><CardTitle>Importar anúncios existentes</CardTitle><CardDescription>Pré-visualize seus anúncios pausados ou ativos antes de vinculá-los ao catálogo mestre. Nada é alterado no marketplace nesta etapa.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
                      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 sm:flex-row">
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={marketplaceType} onChange={(event) => setMarketplaceType(event.target.value as "mercadolivre" | "shopee")}><option value="mercadolivre">Mercado Livre</option><option value="shopee">Shopee</option></select>
            <Button variant="outline" onClick={() => setPreviewEnabled(true)} disabled={listingsLoading}>{listingsLoading ? "Consultando..." : "Consultar anúncios"}</Button>
            <Button onClick={() => stageListings.mutate({ marketplaceType, status: "all", limit: 200 })} disabled={stageListings.isPending}>{stageListings.isPending ? "Importando..." : "Importar para staging"}</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {["exact", "probable", "conflict", "unmatched"].map((kind) => <div key={kind} className="rounded-2xl border bg-white p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{kind === "exact" ? "Exatos" : kind === "probable" ? "Prováveis" : kind === "conflict" ? "Conflitos" : "Sem match"}</p><p className="mt-1 text-2xl font-semibold">{stagedListings.filter((item) => item.matchClass === kind).length}</p></div>)}
          </div>
          {previewEnabled && <div className="overflow-x-auto rounded-2xl border border-slate-200/80"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-400"><tr><th className="p-3">Anúncio</th><th className="p-3">SKU</th><th className="p-3">Status</th><th className="p-3">Estoque</th><th className="p-3">Ação</th></tr></thead><tbody>{listings.map((listing) => <tr key={listing.listingId} className="border-t"><td className="p-3"><div className="font-medium">{listing.title || "Sem título"}</div><div className="text-xs text-muted-foreground">{listing.listingId}</div></td><td className="p-3">{listing.sku || "—"}</td><td className="p-3"><Badge variant="outline">{listing.status}</Badge></td><td className="p-3">{listing.stock ?? "—"}</td><td className="p-3"><Button size="sm" disabled={!activeProductId || linkListing.isPending} onClick={() => linkListing.mutate({ marketplaceType, listingId: listing.listingId, productId: activeProductId!, title: listing.title, description: listing.description, price: listing.price, stock: listing.stock, status: listing.status === "unknown" ? "paused" : listing.status, })}>Vincular ao produto selecionado</Button></td></tr>)}{!listings.length && !listingsLoading && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Nenhum anúncio retornado ou conexão ainda não configurada.</td></tr>}</tbody></table></div>}
          {stagedListings.length > 0 && <div className="space-y-3 rounded-2xl border border-slate-200/80 p-4"><div><h3 className="font-semibold">Fila de revisão do Import Center</h3><p className="text-xs text-muted-foreground">Anúncios em staging não alteram o marketplace. Match abaixo de 99% exige revisão.</p></div>{stagedListings.filter((item) => item.status === "pending" || item.status === "reviewed").map((item) => { const listing = JSON.parse(item.payload) as { title?: string; sku?: string; listingId?: string; status?: string }; return <div key={item.id} className="flex flex-col justify-between gap-3 rounded-xl bg-slate-50 p-3 md:flex-row md:items-center"><div><p className="font-medium">{listing.title || "Sem título"}</p><p className="text-xs text-muted-foreground">{listing.listingId} · SKU {listing.sku || "—"}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{item.matchClass} · {item.matchConfidence}%</Badge><Button size="sm" variant="outline" onClick={() => analyzeMatch.mutate({ stagingId: item.id })}>Recalcular</Button><Button size="sm" variant="outline" disabled={reviewStaged.isPending} onClick={() => reviewStaged.mutate({ stagingId: item.id })}>Revisar</Button><Button size="sm" variant="ghost" disabled={ignoreStaged.isPending} onClick={() => ignoreStaged.mutate({ stagingId: item.id })}>Ignorar</Button>{item.suggestedProductId && <Button size="sm" disabled={linkStaged.isPending || item.matchClass === "conflict" || item.matchClass === "unmatched"} onClick={() => linkStaged.mutate({ stagingId: item.id, productId: item.suggestedProductId! })}>Vincular sugerido</Button>}</div></div>; })}</div>}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>Biblioteca de mídia</CardTitle>
            <CardDescription>Fotos e vídeos ficam ligados ao produto e poderão ser preparados para cada marketplace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeProductId ?? ""} onChange={(event) => setSelectedProductId(Number(event.target.value))}>
              <option value="">Selecione um produto</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
            </select>
            {selectedProduct && <p className="text-sm text-muted-foreground">Produto selecionado: <strong className="text-foreground">{selectedProduct.name}</strong></p>}
            <div className="grid gap-3 md:grid-cols-[110px_1fr]">
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value as "image" | "video")}>
                <option value="image">Imagem</option><option value="video">Vídeo</option>
              </select>
              <Input placeholder="URL pública da mídia" value={url} onChange={(event) => setUrl(event.target.value)} />
            </div>
            <Input placeholder="Texto alternativo / descrição SEO" value={altText} onChange={(event) => setAltText(event.target.value)} />
            <Button disabled={!activeProductId || !url || addMedia.isPending} onClick={() => addMedia.mutate({ productId: activeProductId!, kind, url, altText: altText || undefined, isCover: media.length === 0, sortOrder: media.length })}>
              {addMedia.isPending ? "Salvando..." : "Adicionar mídia"}
            </Button>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {media.map(({ media: item }) => <div key={item.id} className="overflow-hidden rounded-lg border bg-muted/20">
                <div className="aspect-video bg-muted">{item.kind === "image" ? <img src={item.url} alt={item.altText ?? selectedProduct?.name ?? "Mídia"} className="h-full w-full object-cover" /> : <video src={item.url} controls className="h-full w-full object-cover" />}</div>
                <div className="p-2 text-xs"><Badge variant="secondary">{item.kind}</Badge><p className="mt-1 truncate text-muted-foreground">{item.altText || "Sem alt text"}</p></div>
              </div>)}
              {!media.length && <p className="text-sm text-muted-foreground">Nenhuma mídia cadastrada para este produto.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <CardHeader><CardTitle>Fila de sincronização</CardTitle><CardDescription>O job é deduplicado para evitar operações repetidas.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" disabled={!activeProductId || enqueue.isPending} onClick={() => enqueue.mutate({ type: "stock", productId: activeProductId, idempotencyKey: `stock-product-${activeProductId}-${selectedProduct?.stock ?? 0}` })}>Enfileirar estoque</Button><Button variant="secondary" disabled={processJobs.isPending} onClick={() => processJobs.mutate({ limit: 10 })}>{processJobs.isPending ? "Processando..." : "Processar fila"}</Button></div>
            <div className="space-y-2">{jobs.slice(0, 8).map((job) => <div key={job.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-sm transition hover:border-slate-200 hover:bg-white"><div className="flex items-center justify-between gap-2"><span className="font-medium">{job.type}</span><Badge variant="outline">{job.status}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">{job.idempotencyKey}</p></div>)}{!jobs.length && <p className="text-sm text-muted-foreground">Nenhum job registrado ainda.</p>}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
