"use client";

import { ShieldCheck } from "lucide-react";
import { AlertBanner } from "@/components/ui-primitives";
import { useI18n } from "@/lib/i18n";

export function PermissionNotice({
  detailKey = "askOwnerForEditAccess",
  titleKey = "readOnlyWorkspaceAccess"
}: {
  detailKey?: string;
  titleKey?: string;
}) {
  const { t } = useI18n();

  return (
    <AlertBanner icon={<ShieldCheck aria-hidden="true" className="h-5 w-5 text-blue-700" />} tone="info">
      <div>
        <p className="text-sm font-semibold">{t(titleKey)}</p>
        <p className="mt-1 text-sm">{t(detailKey)}</p>
      </div>
    </AlertBanner>
  );
}
