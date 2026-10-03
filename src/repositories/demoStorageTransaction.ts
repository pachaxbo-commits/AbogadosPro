const JOURNAL_KEY = 'abogadospro_demo_transaction_v1';

type Journal = { state: 'pending' | 'committed'; previous: Record<string, string | null> };

export function recoverDemoTransaction(): void {
  const raw = localStorage.getItem(JOURNAL_KEY);
  if (!raw) return;
  const journal = JSON.parse(raw) as Journal;
  if (journal.state === 'pending') {
    for (const [key, value] of Object.entries(journal.previous)) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
  }
  localStorage.removeItem(JOURNAL_KEY);
}

/** All demo records change together, or their previous values are restored. */
export function writeDemoTransaction(changes: Record<string, string | null>): void {
  recoverDemoTransaction();
  const previous = Object.fromEntries(Object.keys(changes).map(key => [key, localStorage.getItem(key)]));
  const journal: Journal = { state: 'pending', previous };
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  try {
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ ...journal, state: 'committed' }));
    localStorage.removeItem(JOURNAL_KEY);
  } catch (error) {
    recoverDemoTransaction();
    throw error;
  }
}
