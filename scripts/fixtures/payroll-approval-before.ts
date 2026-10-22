// Exact historical handler body at3b752e5, wrapped only to supply controlled lexical dependencies.
export async function legacyPayrollApproval(data:any,run:any){
 const user={id:"usr_fin"},statement=[{}],setBusy=()=>{},setNotice=()=>{},t=(key:string)=>key,formatCOP=(value:number)=>String(value),lang="en";
 const audit=async(action:string,entity:string,id:string,diff:unknown)=>data.insert("audit_log",{actor_id:user.id,action,entity,entity_id:id,diff});
  const approve = async () => {
    setBusy('approve'); setNotice(null);
    try {
      const at = new Date().toISOString();
      await data.update('payroll_runs', run.id, { status: 'approved', approved_by: user.id, approved_at: at });
      await audit('payroll.approve', 'payroll_runs', run.id, { before: run.status, after: 'approved', total: run.total, teachers: statement.length });
      setNotice({ tone: 'ok', text: t('admin.payouts.msg.approved', { total: formatCOP(run.total, lang) }) });
    } finally { setBusy(null); }
  };

 return approve();
}
