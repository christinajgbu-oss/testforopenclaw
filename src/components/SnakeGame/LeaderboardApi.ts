import { supabase, getPlayerId } from './SupabaseClient';
import type { GlobalLeaderboardData, DailyLeaderboardData } from './types';

export async function submitGlobalScore(score: number, skinId: string): Promise<void> {
  const { error } = await supabase
    .from('global_leaderboard')
    .insert({ player_id: getPlayerId(), score, skin_id: skinId });
  if (error) console.error('submitGlobalScore error:', error.message);
}

export async function submitDailyScore(date: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('daily_leaderboard')
    .upsert({ player_id: getPlayerId(), date, score }, { onConflict: 'player_id,date' });
  if (error) console.error('submitDailyScore error:', error.message);
}

function withRank<T extends { score: number }>(data: T[], offset = 0): (T & { rank: number })[] {
  return data.map((row, i) => ({ ...row, rank: offset + i + 1 }));
}

export async function fetchGlobalLeaderboard(): Promise<GlobalLeaderboardData> {
  const playerId = getPlayerId();

  const { data: top100 } = await supabase
    .from('global_leaderboard')
    .select('player_id, score, skin_id')
    .order('score', { ascending: false })
    .limit(100);

  const { data: myBest } = await supabase
    .from('global_leaderboard')
    .select('score')
    .eq('player_id', playerId)
    .order('score', { ascending: false })
    .limit(1);

  const myScore = myBest?.[0]?.score ?? null;
  let myRank: number | null = null;
  if (myScore !== null) {
    const { count } = await supabase
      .from('global_leaderboard')
      .select('*', { count: 'exact', head: true })
      .gt('score', myScore);
    myRank = (count ?? 0) + 1;
  }

  const mapped = (top100 ?? []).map((r) => ({
    playerId: r.player_id,
    score: r.score,
    skinId: r.skin_id,
  }));

  return { top100: withRank(mapped), myRank, myBestScore: myScore };
}

export async function fetchDailyLeaderboard(date: string): Promise<DailyLeaderboardData> {
  const playerId = getPlayerId();

  const { data: top100 } = await supabase
    .from('daily_leaderboard')
    .select('player_id, score')
    .eq('date', date)
    .order('score', { ascending: false })
    .limit(100);

  const { data: myData } = await supabase
    .from('daily_leaderboard')
    .select('score')
    .eq('player_id', playerId)
    .eq('date', date)
    .maybeSingle();

  const myScore = myData?.score ?? null;
  let myRank: number | null = null;
  if (myScore !== null) {
    const { count } = await supabase
      .from('daily_leaderboard')
      .select('*', { count: 'exact', head: true })
      .eq('date', date)
      .gt('score', myScore);
    myRank = (count ?? 0) + 1;
  }

  const mapped = (top100 ?? []).map((r) => ({
    playerId: r.player_id,
    score: r.score,
  }));

  return { top100: withRank(mapped), myRank, myScore };
}
