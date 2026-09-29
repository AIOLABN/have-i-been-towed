import {sqliteTable,text,integer,real,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const jobs=sqliteTable('jobs',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),source_filename:text('source_filename').notNull(),object_key:text('object_key').notNull(),state:text('state').notNull(),truck_id:text('truck_id').notNull(),destination:text('destination').notNull(),status:text('status').notNull().default('queued'),created_at:text('created_at').notNull(),lease_id:text('lease_id'),lease_until:integer('lease_until'),attempts:integer('attempts').notNull().default(0),result_count:integer('result_count'),error:text('error'),analyzed_frames:integer('analyzed_frames'),upload_deleted_at:text('upload_deleted_at')
},t=>[index('idx_jobs_owner_created').on(t.owner,t.created_at),index('idx_jobs_owner_status').on(t.owner,t.status)]);
export const records=sqliteTable('records',{
 id:text('id').primaryKey(),job_id:text('job_id').notNull(),owner:text('owner').notNull(),plate:text('plate').notNull(),state:text('state').notNull(),confidence:real('confidence').notNull(),votes:integer('votes').notNull(),detected_at:text('detected_at').notNull(),truck_id:text('truck_id').notNull(),destination:text('destination').notNull(),source_filename:text('source_filename').notNull(),snapshot_key:text('snapshot_key'),review_status:text('review_status').notNull().default('pending'),reviewed_at:text('reviewed_at'),analyzed_frames:integer('analyzed_frames')
},t=>[index('idx_records_lookup').on(t.plate,t.state,t.review_status,t.detected_at),index('idx_records_owner').on(t.owner,t.detected_at),uniqueIndex('idx_records_job_plate').on(t.job_id,t.plate)]);
export const workerTokens=sqliteTable('worker_tokens',{
 token_hash:text('token_hash').primaryKey(),owner:text('owner').notNull(),created_at:text('created_at').notNull(),expires_at:integer('expires_at').notNull(),last_seen:integer('last_seen')
},t=>[uniqueIndex('idx_worker_owner').on(t.owner)]);
export const lookupLimits=sqliteTable('lookup_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),expires_at:integer('expires_at').notNull()});
