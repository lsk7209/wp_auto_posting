import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const jobs = sqliteTable('jobs', {
    job_id: text('job_id').primaryKey(),
    site_id: text('site_id').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
    status: text('status').notNull().default('pending'), // pending, running, partial, completed, failed
    total_rows: integer('total_rows').notNull().default(0),
    processed_rows: integer('processed_rows').notNull().default(0),
    system_prompt: text('system_prompt'),
});

export const jobRows = sqliteTable('job_rows', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    job_id: text('job_id').references(() => jobs.job_id),
    row_index: integer('row_index').notNull(),
    status: text('status').notNull().default('pending'), // pending, success, failed
    error_code: text('error_code'),
    error_message: text('error_message'),
    text_model_id: text('text_model_id'),
    image_model_id: text('image_model_id'),
    wp_post_id: integer('wp_post_id'),
    wp_media_id: integer('wp_media_id'),
    input_data: text('input_data'), // JSON string of the row data
});

export const settings = sqliteTable('settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});

export const sites = sqliteTable('sites', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    username: text('username').notNull(),
    app_password: text('app_password').notNull(), // In a real app, encrypt this!
    default_category_id: integer('default_category_id'),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
});


