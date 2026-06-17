import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { Confidence } from "@/lib/grading/engine";

export function ConfidenceBadge({ confidence }: { confidence: Confidence | null | undefined }) {
  if (!confidence) return null;
  const map = {
    high: { variant: "success" as const, icon: ShieldCheck, label: "High confidence" },
    medium: { variant: "warning" as const, icon: ShieldQuestion, label: "Medium confidence" },
    low: { variant: "destructive" as const, icon: ShieldAlert, label: "Low confidence" },
  };
  const { variant, icon: Icon, label } = map[confidence];
  return (
    <Badge variant={variant}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
