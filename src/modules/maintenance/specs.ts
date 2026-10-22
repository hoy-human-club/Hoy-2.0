import { defineSpec } from '../../specs/define';
export const maintenanceSpec=defineSpec({
 code:'S-10', name:{es:'Mantenimiento futuro',en:'Future maintenance'},
 purpose:{es:'Probar checklists, incidentes no médicos, insumos y equipos ficticios sin operar el estudio.',en:'Try fictional checklists, nonmedical incidents, supplies and equipment without operating the studio.'},
 roles:['super_admin','admin','maintenance'],layout:['MaintenanceWorkbench'],data:['maintenance_records','rooms','audit_log'],
 logic:['OT-02 retains its After Nov30 phase and no owner acceptance.','Only existing maintenance.write roles; no role grants or room/Finance route changes.','New four-kind records require bilingual titles, validated kind fields and explicit preview/save; optional supply minimum defaults null. All records are fictional browser-local drafts. No room readiness/signoff, ordering, alerts, assignments or device controls.','One mock atomic command validates tenant/actor, payload, revision and request fingerprint; failed persistence saves no partial record/audit.','Checklist ownership/location, real thresholds and backend authorization remain unresolved.'],
 integrations:['Disconnected backend; no dispatch or attachments.'],states:['loading','read failure/retry','empty','fictional examples','edit','invalid payload','cancel','save failure/retry','revision conflict','same-request replay','new record','preview without saving','new record cancel/failure/retry'],
 notes:['Sources: manual07 room/heat/maintenance, manual08 nonmedical record principles, OT-02 manifest. No medical or safety instructions added.']
});
