export function aggregate(rows: unknown[], channel?: string): { uniqueEventsObserved: number; [key: string]: unknown };
export function query(days: number, channel: string): string;
export function renderHtml(report: ReturnType<typeof aggregate>): string;
