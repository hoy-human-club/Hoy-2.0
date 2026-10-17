import { defineSpec } from '../../specs/define';
export const subscriptionSpec = defineSpec({
  code:'M-09d', checkedAt:[390,768,1280,1920,3840], name:{es:'Apps y suscripciones',en:'Apps & subscriptions'},
  purpose:{es:'Directorio de servicios y suscripciones con cargos manuales separados.',en:'App dependencies and subscriptions with separate manual charges.'},
  roles:['super_admin','admin','finance'], layout:['Storage notice','Estimates','Directory','Possible integrations','Actual charges'],data:[],
  logic:['Browser-local workspace-scoped records; no production backend.','Unknown amounts stay null; currencies stay separate.','Evidence-backed charge reference is unique per subscription.','Biweekly subscriptions mean every 14 days; the expense ledger uses twice-monthly quincena.'],
  integrations:['Email DISCONNECTED','Bank DISCONNECTED'],states:['empty','editing','saved','conflict','storage failure'],
});
