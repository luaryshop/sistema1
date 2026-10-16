import { useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo de imagem."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("O navegador retornou um formato de imagem inválido."));
        return;
      }
      const separator = reader.result.indexOf(",");
      if (separator < 0) {
        reject(new Error("Não foi possível preparar a imagem para envio."));
        return;
      }
      resolve(reader.result.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });
}

type Props = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  tone?: "light" | "dark";
  label?: string;
  onUploadingChange?: (uploading: boolean) => void;
};

export function ProductImageUploadField({
  value,
  onChange,
  disabled = false,
  tone = "light",
  label = "Imagem do produto",
  onUploadingChange,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const uploadMutation = trpc.dataTools.uploadGithubImage.useMutation();
  const isDark = tone === "dark";
  const helperClass = isDark ? "text-slate-300" : "text-slate-500";
  const borderClass = isDark ? "border-white/20 bg-white/5" : "border-slate-200 bg-slate-50";

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const clearInput = () => {
      if (inputRef.current) inputRef.current.value = "";
    };

    const hasSupportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!ALLOWED_IMAGE_TYPES.has(file.type) && !(file.type === "" && hasSupportedExtension)) {
      toast.error("Escolha uma imagem JPG, PNG ou WebP.");
      clearInput();
      return;
    }
    if (file.size === 0) {
      toast.error("O arquivo selecionado está vazio.");
      clearInput();
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      clearInput();
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const fileBase64 = await readFileAsBase64(file);
      const result = await uploadMutation.mutateAsync({ fileName: file.name, fileBase64 });
      if (!result.url) throw new Error("O serviço não retornou o endereço da imagem.");
      onChange(result.url);
      toast.success("Imagem enviada. Salve o produto para vincular a foto ao cadastro.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      clearInput();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className={isDark ? "text-xs font-medium text-slate-200" : "text-xs font-medium text-slate-700"}>
        {label}
      </Label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
        onChange={(event) => void handleChange(event)}
        className={`block w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-60 ${borderClass} ${helperClass}`}
        aria-describedby={`${inputId}-help`}
      />
      <p id={`${inputId}-help`} className={`text-xs ${helperClass}`}>
        JPG, PNG ou WebP; até 5 MB. A imagem é enviada ao repositório configurado.
      </p>
      {uploading && (
        <p className={`flex items-center gap-2 text-xs ${helperClass}`} role="status" aria-live="polite">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Enviando imagem…
        </p>
      )}
      {value ? (
        <div className={`flex items-center gap-3 rounded-lg border p-2 ${borderClass}`}>
          <img src={value} alt="Pré-visualização da imagem do produto" className="h-16 w-16 rounded-md border object-cover" />
          <span className={`min-w-0 flex-1 truncate text-xs ${helperClass}`}>Imagem selecionada</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
            aria-label="Desvincular imagem do produto"
          >
            <X className="mr-1 h-4 w-4" /> Remover
          </Button>
        </div>
      ) : (
        <div className={`flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs ${borderClass} ${helperClass}`}>
          <ImagePlus className="h-4 w-4 shrink-0" /> Nenhuma imagem selecionada.
        </div>
      )}
    </div>
  );
}
