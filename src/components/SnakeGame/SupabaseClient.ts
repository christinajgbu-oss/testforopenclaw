import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://gzfmqpszjljdsbskgkdz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Zm1xcHN6amxqZHNic2tna2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODgwNjAsImV4cCI6MjA5MDE2NDA2MH0.-hRpnT8YgmatuPdGpOs2ZvzxQZzxRZycWHWRW_FETPA',
);

export const PLAYER_ID_KEY = 'snake_player_id';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return 'server';
  const id = localStorage.getItem(PLAYER_ID_KEY);
  if (id) return id;
  const newId = crypto.randomUUID();
  localStorage.setItem(PLAYER_ID_KEY, newId);
  return newId;
}
