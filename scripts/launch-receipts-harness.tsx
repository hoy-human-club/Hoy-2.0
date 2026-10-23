// Dev-only actual history-page read faults. No application imports this harness.
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { MockProvider } from '../src/data/MockProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { SessionProvider } from '../src/auth/SessionProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { getStrings } from '../src/app/registry';
import { HistoryPage } from '../src/modules/customer/pages/HistoryPage';
import '../src/modules/customer/customer.css';
let root: Root | null = null;
export function mountReceiptHistory(mode: string) {
  root?.unmount(); document.getElementById('receipt-history-harness')?.remove();
  const provider = new MockProvider(), list = provider.list.bind(provider);
  const state = window as unknown as { receiptFault: string };
  state.receiptFault = mode;
  provider.list = async (table, query) => { if (state.receiptFault === table) throw Error('FICTIONAL_READ_FAILURE'); return list(table, query); };
  const node = document.createElement('div'); node.id = 'receipt-history-harness'; document.body.append(node);
  document.getElementById('root')!.style.display = 'none';
  root = createRoot(node);
  root.render(<I18nProvider tables={getStrings()}><DataProviderRoot provider={provider}><SessionProvider><MemoryRouter initialEntries={['/app/history?tab=payments']}><HistoryPage /></MemoryRouter></SessionProvider></DataProviderRoot></I18nProvider>);
}
