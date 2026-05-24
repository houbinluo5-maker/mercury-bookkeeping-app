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
