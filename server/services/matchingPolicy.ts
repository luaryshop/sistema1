export type MatchingPolicyInput = { matchClass: string; stagingStatus: string };

export function canLinkMatch({ matchClass, stagingStatus }: MatchingPolicyInput): { allowed: boolean; reason?: string } {
  if (matchClass === "unmatched") return { allowed: false, reason: "Anúncio sem correspondência não pode ser vinculado automaticamente" };
  if (matchClass === "conflict") return { allowed: false, reason: "Conflito de matching exige resolução antes do vínculo" };
  if (matchClass === "probable" && stagingStatus !== "reviewed") return { allowed: false, reason: "Correspondência provável exige revisão humana antes do vínculo" };
  if (matchClass !== "exact" && matchClass !== "probable") return { allowed: false, reason: "Classe de matching inválida" };
  return { allowed: true };
}
