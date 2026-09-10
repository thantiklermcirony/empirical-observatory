import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
