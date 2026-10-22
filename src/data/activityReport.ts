import { reportCsv } from './reportCsv';
export interface ActivityReportRow { created_at: string; who: string; roleLabel: string; action: string; entity: string; entity_id: string | null; object: string; source: string; diff: { role?: unknown; source?: unknown; [key: string]: unknown } | null }
/** One search predicate for screen count, visible table, detail selection and CSV export. */
export function activitySearch<T extends ActivityReportRow>(rows: T[], search: string): T[] {
  const q = search.trim().toLocaleLowerCase();
  return q ? rows.filter(r => [r.created_at,r.who,r.roleLabel,r.action,r.object,r.source].some(v => v.toLocaleLowerCase().includes(q))) : rows;
}
export function activityReportCsv(rows: ActivityReportRow[]): string {
  return reportCsv(['when','actor','role','action','entity','entity_id','source','diff'], rows.map(r => [r.created_at,r.who,String(r.diff?.role??''),r.action,r.entity,r.entity_id,String(r.diff?.source??''),JSON.stringify(r.diff??{})]));
}
