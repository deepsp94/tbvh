import { Badge } from "./ui/Badge";

interface Props {
  teeAttested: number;
  signature: string | null;
}

export function TeeBadge({ teeAttested, signature }: Props) {
  if (!signature) return null;

  if (teeAttested === 1) {
    return <Badge variant="green">TEE Verified</Badge>;
  }

  return <Badge variant="zinc">Signed (Dev)</Badge>;
}
