export function promptOptionalAuditReason(
  t: (key: string) => string,
  actionLabel: string
) {
  const response = window.prompt(
    t("optionalAuditReasonPrompt").replace("{action}", actionLabel),
    ""
  );

  if (response === null) return null;

  return response.trim();
}

export function promptRequiredAuditReason(
  t: (key: string) => string,
  actionLabel: string
) {
  const response = window.prompt(
    `${t("closedPeriodEditReasonRequired")} ${actionLabel}`,
    ""
  );

  if (response === null) return null;

  const trimmed = response.trim();
  if (!trimmed) {
    window.alert(t("closedPeriodEditReasonRequired"));
    return null;
  }

  return trimmed;
}
