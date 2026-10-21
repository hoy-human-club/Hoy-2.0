import type { ReactNode } from 'react';
import './CheckboxField.css';
export interface CheckboxFieldProps { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; children: ReactNode }
/** A native checkbox whose whole wrapping label is a comfortable tap target. */
export function CheckboxField({ checked, onChange, disabled = false, children }: CheckboxFieldProps) {
  return <label className="checkbox-field"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span>{children}</span></label>;
}
