/**
 * KokiKasir — Background Sync Service
 *
 * Pushes "pending" local records to Supabase whenever the device comes online.
 * Currently a scaffold — activate by:
 *   1. Installing @supabase/supabase-js (`pnpm add @supabase/supabase-js`)
 *   2. Populating VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
 *   3. Uncomment the Supabase calls below
 *
 * The sync service is intentionally a plain module (not a React hook) so it
 * can be called from AppContext, background tasks, or service workers.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { getUnreportedLogs, markLogsAsReported } from '../utils/errorLogger';

let _syncInProgress = false;
let _onSyncStateChange = null; // (state: 'idle'|'syncing'|'error') => void

/**
 * Register a callback to be notified when sync state changes.
 * This is wired to the useNetworkStatus setSyncState in AppContext.
 */
export function registerSyncStateCallback(cb) {
  _onSyncStateChange = cb;
}

function setSyncState(state) {
  if (typeof _onSyncStateChange === 'function') {
    _onSyncStateChange(state);
  }
}

/**
 * Syncs all local "pending" data to Supabase.
 * Safe to call multiple times — no-op if already syncing or not configured.
 *
 * @param {object} opts
 * @param {Array}  opts.menuItems       - current menuItems from AppContext
 * @param {Array}  opts.orders          - current orders from AppContext
 * @param {object} opts.storeSettings   - current storeSettings from AppContext
 * @param {string} opts.qrisImage       - current qrisImage (base64)
 * @param {Function} opts.onMenuSynced  - callback to update local syncStatus fields
 * @param {Function} opts.onOrderSynced - callback to update local syncStatus fields
 */
export async function syncToSupabase({
  menuItems = [],
  orders = [],
  storeSettings = {},
  qrisImage = '',
  onMenuSynced,
  onOrderSynced,
} = {}) {
  if (_syncInProgress) return;
  if (!isSupabaseConfigured()) return;
  if (!navigator.onLine) return;

  const client = getSupabaseClient();
  if (!client) return;

  _syncInProgress = true;
  setSyncState('syncing');

  try {
    /* ── Uncomment after installing @supabase/supabase-js ──────────────────

    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) {
      setSyncState('idle');
      return;
    }
    const userId = session.user.id;

    // 1. Sync pending menu items
    const pendingMenus = menuItems.filter(m => m.syncStatus === 'pending');
    if (pendingMenus.length > 0) {
      const rows = pendingMenus.map(m => ({
        id: m.id,
        user_id: userId,
        name: m.name,
        category: m.category,
        price: m.price,
        status: m.status,
        image: m.image,
        description: m.description,
        sync_status: 'synced',
        updated_at: new Date().toISOString()
      }));
      const { error } = await client.from('menu_items').upsert(rows, { onConflict: 'id' });
      if (!error && typeof onMenuSynced === 'function') {
        onMenuSynced(pendingMenus.map(m => m.id));
      }
    }

    // 2. Sync pending orders
    const pendingOrders = orders.filter(o => o.syncStatus === 'pending');
    if (pendingOrders.length > 0) {
      const rows = pendingOrders.map(o => ({
        id: o.id,
        user_id: userId,
        customer_name: o.customerName,
        order_type: o.orderType,
        items: o.items,
        total: o.total,
        status: o.status,
        payment_method: o.paymentMethod,
        cash_given: o.cashGiven,
        change: o.change,
        paid_at: o.paidAt,
        paid_timestamp: o.paidTimestamp,
        date: o.date,
        created_at: o.createdAt,
        sync_status: 'synced',
        updated_at: new Date().toISOString()
      }));
      const { error } = await client.from('orders').upsert(rows, { onConflict: 'id' });
      if (!error && typeof onOrderSynced === 'function') {
        onOrderSynced(pendingOrders.map(o => o.id));
      }
    }

    // 3. Sync error logs
    const unreportedLogs = getUnreportedLogs();
    if (unreportedLogs.length > 0) {
      const rows = unreportedLogs.map(log => ({
        id: log.id,
        user_id: userId,
        timestamp: log.timestamp,
        message: log.message,
        stack: log.stack,
        component_stack: log.componentStack,
        route: log.route,
        app_version: log.appVersion,
        reported: true
      }));
      const { error } = await client.from('error_logs').upsert(rows, { onConflict: 'id' });
      if (!error) {
        markLogsAsReported(unreportedLogs.map(l => l.id));
      }
    }

    setSyncState('idle');
    ─────────────────────────────────────────────────────────────────────── */

    // Scaffold placeholder — no-op until Supabase is configured
    setSyncState('idle');
  } catch (err) {
    console.error('[KokiKasir] Sync error:', err);
    setSyncState('error');
  } finally {
    _syncInProgress = false;
  }
}

/**
 * Returns the last-synced timestamp stored locally.
 * @returns {string|null}
 */
export function getLastSyncedAt() {
  return localStorage.getItem('kokikasir_last_synced_at');
}

/**
 * Saves the current time as the last-synced timestamp.
 */
export function updateLastSyncedAt() {
  localStorage.setItem('kokikasir_last_synced_at', new Date().toISOString());
}
