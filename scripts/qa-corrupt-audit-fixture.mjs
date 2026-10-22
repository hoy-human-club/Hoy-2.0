/** Test-only historical/corrupt-cache injection. Never imported by application code.
 * Public MockProvider writes remain append-only; these fixtures deliberately model
 * pre-existing storage damage so command replay/acknowledgement fences stay tested.
 */
export function corruptAuditFixture(data, operation, id, patch) {
  if(data.name!=='mock'||!Array.isArray(data.db?.audit_log)||typeof data.persist!=='function')throw Error('fictional_mock_fixture_required');
  const rows=structuredClone(data.db.audit_log),index=rows.findIndex(row=>row.id===id);
  if(index<0)throw Error('fictional_audit_fixture_missing');
  if(operation==='remove')rows.splice(index,1);
  else if(operation==='update')rows[index]={...rows[index],...structuredClone(patch)};
  else throw Error('fictional_audit_fixture_operation');
  data.db={...data.db,audit_log:rows};data.persist();
}
