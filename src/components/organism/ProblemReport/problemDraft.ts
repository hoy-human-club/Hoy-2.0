/** Local UI draft only. No intake service, dispatch or shared persistence exists. */
export interface ProblemContext { tenantId: string; actorId: string; actorName: string; role: string; route: string }
export interface ProblemDraft extends ProblemContext { id: string; title: string; description: string; savedAt: string }
export interface DraftStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const problemDraftKey = (context: ProblemContext) => `hoyos.problem-draft.v1.${encodeURIComponent(context.tenantId)}.${encodeURIComponent(context.actorId)}.${encodeURIComponent(context.role)}`;
export function problemDraftErrors(title: string, description: string): { title?: boolean; description?: boolean } {
  return { title: title.trim().length < 3 || title.trim().length > 120, description: description.trim().length < 10 || description.trim().length > 2000 };
}
export function readProblemDraft(storage: DraftStorage, context: ProblemContext): ProblemDraft | null {
  const raw = storage.getItem(problemDraftKey(context));
  if (!raw) return null;
  const value = JSON.parse(raw) as ProblemDraft;
  if (!value || value.tenantId !== context.tenantId || value.actorId !== context.actorId || value.role !== context.role || typeof value.id !== 'string' || typeof value.actorName !== 'string' || typeof value.title !== 'string' || typeof value.description !== 'string' || typeof value.route !== 'string' || !value.route.startsWith('#/') || typeof value.savedAt !== 'string') throw new Error('local_draft_invalid');
  return value;
}
export function saveProblemDraft(storage: DraftStorage, context: ProblemContext, input: { id: string; title: string; description: string }, now = new Date().toISOString()): ProblemDraft {
  const errors = problemDraftErrors(input.title, input.description);
  if (errors.title || errors.description || !input.id || !context.route.startsWith('#/')) throw new Error('local_draft_validation');
  const previous = readProblemDraft(storage, context);
  const fields = { ...context, id: input.id, title: input.title.trim(), description: input.description.trim() };
  if (previous && Object.entries(fields).every(([key, value]) => previous[key as keyof ProblemDraft] === value)) return previous;
  const draft: ProblemDraft = { ...fields, savedAt: now };
  storage.setItem(problemDraftKey(context), JSON.stringify(draft));
  return draft;
}
