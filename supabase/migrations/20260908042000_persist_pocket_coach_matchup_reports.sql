alter table public.ai_messages
  add column if not exists matchup_report jsonb;

comment on column public.ai_messages.matchup_report is
  'Structured Pocket Coach matchup report payload for assistant messages; null for messages without a report.';
