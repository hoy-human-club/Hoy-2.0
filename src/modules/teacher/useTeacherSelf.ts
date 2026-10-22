import { useCallback, useState } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { TeacherRow } from '../../data/schema';
import {tenant} from '../../tenant/tenant';
import {canChooseTeacherPreview,teacherIdentity} from './classOwnership';

const KEY = 'hoyos.teach.as';

/**
 * The teacher profile behind the signed-in user. Coordinators and admins reviewing the teacher app
 * are not linked to a `teachers` row, so they can pick one (kept per browser, demo only).
 */
export function useTeacherSelf() {
  const { user,role } = useSession();
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where:{tenant_id:tenant.id,...(role==='teacher'?{user_id:user.id}:{})},orderBy: { column: 'display_name' } });
  const [pick, setPick] = useState<string | null>(() => { try { return localStorage.getItem(KEY); } catch { return null; } });
  const actor={userId:user.id,role,name:user.name};
  const canChoose=canChooseTeacherPreview(role);
  const me=teacherIdentity(teachers,actor,pick);
  const linked=!!me&&me.user_id===user.id;
  const choose = useCallback((id: string | null) => { if(!canChoose)return;setPick(id); try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch { /* ignore */ } }, [canChoose]);
  return { me, linked, teachers, choose,canChoose };
}
