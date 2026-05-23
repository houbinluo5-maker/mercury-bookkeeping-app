export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthName(monthIndex: number) {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(2026, monthIndex, 1)
  );
}

export function signedClass(value: number) {
  if (value > 0) return "text-mint";
  if (value < 0) return "text-coral";
  return "text-slate-500";
}
