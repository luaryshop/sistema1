import { TRPCError } from "@trpc/server";

interface UploadToGitHubParams {
  fileName: string;
  fileBase64: string; // Conteúdo da imagem em Base64
  folder?: string;
}

export async function uploadImageToGitHub({
  fileName,
  fileBase64,
  folder = "client/public/uploads/products",
}: UploadToGitHubParams) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER; // Seu usuário ou organização do GitHub
  const repo = process.env.GITHUB_REPO; // Nome do repositório
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Credenciais do GitHub não configuradas no ambiente (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO).",
    });
  }

  const cleanFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `${folder}/${Date.now()}-${cleanFileName}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    // 1. Enviar requisição PUT para a API do GitHub criando/atualizando o arquivo
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "User-Agent": "Luary-Shop-App",
      },
      body: JSON.stringify({
        message: `feat(storage): upload de imagem do produto ${cleanFileName}`,
        content: fileBase64,
        branch: branch,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Erro ao commitar imagem no GitHub");
    }

    // 2. Retorna a URL pública estática pronta para uso nos Marketplaces
    const publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    return { success: true, url: publicUrl };
  } catch (error: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Falha no upload para o GitHub: ${error.message}`,
    });
  }
}
