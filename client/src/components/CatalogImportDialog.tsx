import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { catalogCsvTemplate, catalogRowsFromCsv, type CatalogCsvResult } from "@shared/catalogCsv";

type ImportMode = "create_only" | "upsert";
type ImportOutcome = { created: number; updated: number; failed: number; errors: Array<{ sku: string; message: string }> };

const brl = (cents?: number) => (cents === undefined ? "—" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

export function CatalogImportDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<CatalogCsvResult | null>(null);
  const [mode, setMode] = useState<ImportMode>("create_only");
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = trpc.dataTools.importCatalog.useMutation();

  const reset = () => { setFileName(""); setParsed(null); setOutcome(null); setMode("create_only"); if (fileRef.current) fileRef.current.value = ""; };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setOutcome(null);
    setFileName(file.name);
    try {
      setParsed(catalogRowsFromCsv(await file.text()));
    } catch {
      setParsed(null);
      toast.error("Não consegui ler esse arquivo. Salve a planilha como CSV UTF-8 e tente de novo.");
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([catalogCsvTemplate()], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "modelo_cadastro_mestre.csv"; link.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (!parsed || parsed.rows.length === 0) return;
    try {
      const result = await importMutation.mutateAsync({ rows: parsed.rows, mode });
      setOutcome(result);
      onDone();
      if (result.failed === 0) toast.success(`Importação concluída: ${result.created} criado(s), ${result.updated} atualizado(s).`);
      else toast.warning(`${result.created} criado(s), ${result.updated} atualizado(s), ${result.failed} com problema.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar a planilha.");
    }
  };

  const ready = parsed?.rows.length ?? 0;
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { reset(); setOpen(true); }}>
        <Upload className="mr-2 h-4 w-4" /> Importar planilha
      </Button>
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar produtos por planilha</DialogTitle>
            <DialogDescription>Arquivo CSV (Excel: Salvar como → CSV UTF-8). Colunas obrigatórias: sku e nome.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="text-sm" onChange={(e) => void handleFile(e.target.files?.[0])} />
            <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" /> Baixar modelo</Button>
          </div>

          {parsed && !outcome && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">{fileName}</span>
                <Badge variant="secondary">{parsed.totalDataLines} linha(s) lida(s)</Badge>
                <Badge className="bg-emerald-600 text-white">{ready} pronta(s)</Badge>
                {parsed.issues.length > 0 && <Badge variant="destructive">{parsed.issues.length} com problema</Badge>}
              </div>
              {parsed.ignoredColumns.length > 0 && (
                <p className="text-xs text-muted-foreground">Colunas ignoradas (não reconhecidas): {parsed.ignoredColumns.join(", ")}</p>
              )}
              {parsed.issues.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="mb-1 font-semibold">Linhas que NÃO serão importadas:</p>
                  <ul className="list-disc pl-5">
                    {parsed.issues.slice(0, 10).map((issue, i) => <li key={i}>Linha {issue.line}{issue.sku ? ` (${issue.sku})` : ""}: {issue.message}</li>)}
                  </ul>
                  {parsed.issues.length > 10 && <p className="mt-1">…e mais {parsed.issues.length - 10}.</p>}
                </div>
              )}
              {ready > 0 && (
                <>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted"><tr>{["SKU", "Nome", "Categoria", "Custo", "Venda", "Estoque"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
                      <tbody>
                        {parsed.rows.slice(0, 5).map((row) => (
                          <tr key={row.sku} className="border-t">
                            <td className="px-3 py-2 font-mono">{row.sku}</td>
                            <td className="max-w-[260px] truncate px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.category ?? "—"}</td>
                            <td className="px-3 py-2">{brl(row.costBase)}</td>
                            <td className="px-3 py-2">{brl(row.basePrice)}</td>
                            <td className="px-3 py-2">{row.stock ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ready > 5 && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Mostrando 5 de {ready}.</p>}
                  </div>

                  <RadioGroup value={mode} onValueChange={(value) => setMode(value as ImportMode)} className="gap-3">
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <RadioGroupItem value="create_only" className="mt-1" />
                      <span><strong>Criar só novos</strong> (recomendado na primeira carga). SKU que já existe é pulado e avisado — nada é sobrescrito.</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <RadioGroupItem value="upsert" className="mt-1" />
                      <span><strong>Criar novos e atualizar existentes</strong>. Só mudam as colunas preenchidas; célula vazia nunca apaga o que já está cadastrado.</span>
                    </label>
                  </RadioGroup>

                  <Button onClick={() => void runImport()} disabled={importMutation.isPending} className="w-full">
                    {importMutation.isPending ? "Importando…" : `Importar ${ready} produto(s)`}
                  </Button>
                </>
              )}
            </div>
          )}

          {outcome && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-600 text-white">{outcome.created} criado(s)</Badge>
                <Badge variant="secondary">{outcome.updated} atualizado(s)</Badge>
                {outcome.failed > 0 && <Badge variant="destructive">{outcome.failed} com problema</Badge>}
              </div>
              {outcome.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                  <p className="mb-1 font-semibold">Não importados:</p>
                  <ul className="list-disc pl-5">{outcome.errors.map((e) => <li key={e.sku}>{e.sku}: {e.message}</li>)}</ul>
                </div>
              )}
              <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
