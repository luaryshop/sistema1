import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

type Channel = "store" | "mercadolivre" | "shopee";

export default function SEOAdvanced() {
  const { data: products = [], isLoading } = trpc.products.list.useQuery();
  const [productId, setProductId] = useState<number | undefined>();
  const [channel, setChannel] = useState<Channel>("store");
  const activeId = productId ?? products[0]?.id;
  const { data: saved } = trpc.seoAdvanced.get.useQuery({ productId: activeId ?? 0, channel }, { enabled: Boolean(activeId) });
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [altText, setAltText] = useState("");
  const [slug, setSlug] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [analysis, setAnalysis] = useState<{ score: number; issues: string[]; schemaJson?: string } | null>(null);
  const analyze = trpc.seoAdvanced.analyze.useMutation({ onSuccess: (result) => { setAnalysis(result); toast.success(`Score SEO: ${result.score}/100`); }, onError: (error) => toast.error(error.message) });
  const save = trpc.seoAdvanced.save.useMutation({ onSuccess: (result) => { setAnalysis(result); toast.success("Perfil SEO salvo"); }, onError: (error) => toast.error(error.message) });
  const product = useMemo(() => products.find((item) => item.id === activeId), [products, activeId]);

  useEffect(() => {
    setSeoTitle(saved?.seoTitle ?? ""); setMetaDescription(saved?.metaDescription ?? ""); setFocusKeyword(saved?.focusKeyword ?? "");
    setSecondaryKeywords(saved?.secondaryKeywords ? parseJsonArray(saved.secondaryKeywords).join(", ") : ""); setAltText(saved?.altText ?? ""); setSlug(saved?.slug ?? ""); setCanonicalUrl(saved?.canonicalUrl ?? "");
    setAnalysis(saved ? { score: saved.score, issues: parseJsonArray(saved.issues), schemaJson: saved.schemaJson ?? undefined } : null);
  }, [saved]);

  const payload = () => ({ productId: activeId!, channel, seoTitle: seoTitle || undefined, metaDescription: metaDescription || undefined, focusKeyword: focusKeyword || undefined, secondaryKeywords: secondaryKeywords.split(",").map((value) => value.trim()).filter(Boolean), altText: altText || undefined, slug: slug || undefined, canonicalUrl: canonicalUrl || undefined });
  if (isLoading) return <div className="mx-auto max-w-[1500px] py-8 text-sm text-slate-500">Carregando produtos...</div>;

  return <div className="mx-auto max-w-[1500px] space-y-7">
    <header className="relative overflow-hidden rounded-[28px] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200/70 md:p-8"><div className="absolute right-[-50px] top-[-70px] h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" /><div className="relative"><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300"><Sparkles className="h-3.5 w-3.5" /> Inteligência de catálogo</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">SEO avançado</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Otimize páginas da loja e conteúdos de marketplace com regras mensuráveis, palavra-chave principal, alt text, URLs e dados estruturados.</p></div></header>
    <Card className="rounded-3xl border-slate-200/80 shadow-sm"><CardContent className="grid gap-4 pt-6 md:grid-cols-[1fr_220px]"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={activeId ?? ""} onChange={(event) => setProductId(Number(event.target.value))}><option value="">Selecione o produto</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={channel} onChange={(event) => setChannel(event.target.value as Channel)}><option value="store">Loja própria</option><option value="mercadolivre">Mercado Livre</option><option value="shopee">Shopee</option></select></CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="rounded-3xl border-slate-200/80 shadow-sm"><CardHeader><CardTitle>{product?.name ?? "Produto"}</CardTitle><CardDescription>Campos com limites e qualidade verificáveis antes da publicação.</CardDescription></CardHeader><CardContent className="space-y-4"><div><label className="text-sm font-medium">Título SEO</label><Input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} placeholder="Ex.: Brinco dourado minimalista" /><p className="mt-1 text-xs text-muted-foreground">{seoTitle.length}/60 caracteres recomendados</p></div><div><label className="text-sm font-medium">Meta description</label><Textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} placeholder="Resumo persuasivo da página..." /><p className="mt-1 text-xs text-muted-foreground">{metaDescription.length}/160 caracteres recomendados</p></div><div className="grid gap-4 md:grid-cols-2"><div><label className="text-sm font-medium">Palavra-chave principal</label><Input value={focusKeyword} onChange={(event) => setFocusKeyword(event.target.value)} /></div><div><label className="text-sm font-medium">Palavras secundárias</label><Input value={secondaryKeywords} onChange={(event) => setSecondaryKeywords(event.target.value)} placeholder="separadas, por vírgula" /></div></div><div className="grid gap-4 md:grid-cols-2"><div><label className="text-sm font-medium">Slug</label><Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="brinco-dourado-minimalista" /></div><div><label className="text-sm font-medium">Alt text da capa</label><Input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Descrição objetiva da imagem" /></div></div><div><label className="text-sm font-medium">URL canônica</label><Input value={canonicalUrl} onChange={(event) => setCanonicalUrl(event.target.value)} placeholder="https://sualoja.com/produtos/..." /></div><div className="flex flex-wrap gap-2"><Button disabled={!activeId || analyze.isPending} variant="outline" onClick={() => analyze.mutate(payload())}>{analyze.isPending ? "Analisando..." : "Analisar qualidade"}</Button><Button disabled={!activeId || save.isPending} onClick={() => save.mutate(payload())}>{save.isPending ? "Salvando..." : "Salvar perfil SEO"}</Button></div></CardContent></Card>
      <Card className="rounded-3xl border-slate-200/80 shadow-sm"><CardHeader><CardTitle>Score de qualidade</CardTitle><CardDescription>Indicador explicável, não promessa de posição no Google.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-end gap-2 rounded-2xl bg-slate-50 p-4"><span className="text-5xl font-semibold tracking-[-0.06em] text-slate-950">{analysis?.score ?? saved?.score ?? 0}</span><span className="pb-2 text-muted-foreground">/ 100</span></div>{(analysis?.issues ?? parseJsonArray(saved?.issues)).map((issue) => <div key={issue} className="rounded-2xl border border-amber-200/80 bg-amber-50 p-3 text-sm leading-5 text-amber-900">{issue}</div>)}{!analysis?.issues?.length && !saved?.issues && <p className="text-sm text-muted-foreground">Execute uma análise para ver recomendações.</p>}{(analysis?.schemaJson || saved?.schemaJson) && <details><summary className="cursor-pointer text-sm font-medium">Ver JSON-LD</summary><pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{analysis?.schemaJson || saved?.schemaJson}</pre></details>}<Badge variant="outline">{channel === "store" ? "SEO técnico" : "Conteúdo do canal"}</Badge></CardContent></Card>
    </div>
  </div>;
}

function parseJsonArray(value?: string | null): string[] { try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; } }
