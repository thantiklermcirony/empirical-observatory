import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

export const dailyInterest = sqliteTable('daily_interest', {
  day: text('day').primaryKey(),
  pageViews: integer('page_views').notNull().default(0),
  projectViews: integer('project_views').notNull().default(0),
  labOpens: integer('lab_opens').notNull().default(0),
  sourceClicks: integer('source_clicks').notNull().default(0),
  githubEntries: integer('github_entries').notNull().default(0),
  searchEntries: integer('search_entries').notNull().default(0),
  socialEntries: integer('social_entries').notNull().default(0),
  otherEntries: integer('other_entries').notNull().default(0),
  directEntries: integer('direct_entries').notNull().default(0),
  verificationEvents: integer('verification_events').notNull().default(0),
});

export const labPrintouts = sqliteTable('lab_printouts', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
  createdDay: text('created_day').notNull(),
  expiresAt: text('expires_at').notNull(),
  printoutJson: text('printout_json').notNull(),
}, table => [index('lab_printouts_created_day').on(table.createdDay), index('lab_printouts_expiry').on(table.expiresAt)]);

export const aiDailyCalls = sqliteTable('ai_daily_calls', {
  day: text('day').primaryKey(),
  calls: integer('calls').notNull().default(0),
});

export const frameworkProposals = sqliteTable('framework_proposals', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  status: text('status').notNull().default('generating'),
  prompt: text('prompt').notNull(),
  bodyJson: text('body_json'),
  error: text('error'),
}, table => [index('framework_proposals_status_created').on(table.status, table.createdAt)]);
export const frameworkEvents = sqliteTable('framework_events', {
  id: text('id').primaryKey(),
  proposalId: text('proposal_id').notNull(),
  actorId: text('actor_id').notNull(),
  createdAt: text('created_at').notNull(),
  action: text('action').notNull(),
  receipt: text('receipt'),
}, table => [index('framework_events_proposal_created').on(table.proposalId, table.createdAt)]);
