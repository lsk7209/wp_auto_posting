import { db } from '@/db';
import { jobs, jobRows } from '@/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import * as aiService from './ai_service';
import * as wpService from './wp_service';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Helper to read sites.json
async function getSiteConfig(siteId: string) {
    const sitesPath = path.join(process.cwd(), 'data', 'sites.json');
    const sitesRaw = await fs.readFile(sitesPath, 'utf-8');
    const sites = JSON.parse(sitesRaw);
    return sites.find((s: any) => s.id === siteId);
}

// Helper to read prompts.json
async function getPrompt(promptId: string) {
    // For now, we might not have prompt_id in the payload, or it's part of the logic.
    // The PRD says "Prompt 선택 -> 수정". So the prompt content might be passed directly or ID.
    // Let's assume we pass the prompt content or ID.
    // If ID, we fetch from prompts.json.
    // For simplicity, let's assume the manager receives the actual system prompt string or we fetch default.
    const promptsPath = path.join(process.cwd(), 'data', 'prompts.json');
    const promptsRaw = await fs.readFile(promptsPath, 'utf-8');
    const prompts = JSON.parse(promptsRaw);
    // Return first for now or find by ID if passed
    return prompts[0].content;
}

export async function dispatch_job(payload: any) {
    const { site_id, text_model_id, image_model_id, rows, system_prompt } = payload;
    const jobId = uuidv4();

    // Create Job
    await db.insert(jobs).values({
        job_id: jobId,
        site_id,
        total_rows: rows.length,
        status: 'pending',
        system_prompt,
    });

    // Create Job Rows
    // Drizzle insert many
    const rowValues = rows.map((row: any, index: number) => ({
        job_id: jobId,
        row_index: index,
        status: 'pending',
        text_model_id,
        image_model_id,
        input_data: JSON.stringify(row),
    }));

    if (rowValues.length > 0) {
        await db.insert(jobRows).values(rowValues);
    }

    return jobId;
}

export async function process_tick(limit: number = 5) {
    // 1. Find pending or running jobs
    const activeJobs = await db.select().from(jobs).where(inArray(jobs.status, ['pending', 'running', 'partial']));

    if (activeJobs.length === 0) {
        return { message: 'No active jobs' };
    }

    // Get pending rows for these jobs
    const jobIds = activeJobs.map(j => j.job_id);

    const pendingRows = await db.select()
        .from(jobRows)
        .where(and(
            inArray(jobRows.job_id, jobIds),
            eq(jobRows.status, 'pending')
        ))
        .limit(limit);

    if (pendingRows.length === 0) {
        // Check if jobs are complete
        for (const job of activeJobs) {
            const pendingCountResult = await db.select({ count: sql<number>`count(*)` })
                .from(jobRows)
                .where(and(eq(jobRows.job_id, job.job_id), eq(jobRows.status, 'pending')));

            const pendingCount = pendingCountResult[0].count;

            if (pendingCount === 0) {
                // Check if any failed
                const failedCountResult = await db.select({ count: sql<number>`count(*)` })
                    .from(jobRows)
                    .where(and(eq(jobRows.job_id, job.job_id), eq(jobRows.status, 'failed')));

                const failedCount = failedCountResult[0].count;

                const newStatus = failedCount > 0 ? 'partial' : 'completed';

                // Only update if status changed
                if (job.status !== newStatus) {
                    await db.update(jobs).set({ status: newStatus }).where(eq(jobs.job_id, job.job_id));
                }
            }
        }
        return { message: 'No pending rows' };
    }

    // Process rows in parallel
    const results = await Promise.all(pendingRows.map(async (row) => {
        try {
            const inputData = JSON.parse(row.input_data || '{}');

            const job = activeJobs.find(j => j.job_id === row.job_id);
            if (!job) return { rowId: row.id, status: 'skipped', error: 'Job not found' };

            const siteConfig = await getSiteConfig(job.site_id);
            if (!siteConfig) {
                throw new Error(`Site config not found for site_id: ${job.site_id}`);
            }

            // 1. Generate Text
            const systemPrompt = job.system_prompt || await getPrompt('default');
            const generatedContent = await aiService.generate_post_content(inputData, systemPrompt, row.text_model_id || 'gemini-pro');

            // 2. Generate Image (if needed)
            let mediaId = null;
            if (row.image_model_id) {
                const imagePrompt = generatedContent.image_prompt || generatedContent.title;
                const imageBuffer = await aiService.generate_image_bytes(imagePrompt, row.image_model_id);
                mediaId = await wpService.upload_media(siteConfig, imageBuffer);
            }

            // 3. Publish Post
            const postId = await wpService.publish_post(siteConfig, {
                ...generatedContent,
                featured_media: mediaId,
                status: 'publish'
            });

            // 4. Update Row
            await db.update(jobRows).set({
                status: 'success',
                wp_post_id: postId,
                wp_media_id: mediaId
            }).where(eq(jobRows.id, row.id));

            // Increment processed count for job
            await db.update(jobs).set({
                processed_rows: sql`${jobs.processed_rows} + 1`
            }).where(eq(jobs.job_id, job.job_id));

            return { rowId: row.id, status: 'success' };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error processing row ${row.id}:`, error);
            await db.update(jobRows).set({
                status: 'failed',
                error_message: errorMessage
            }).where(eq(jobRows.id, row.id));

            const job = activeJobs.find(j => j.job_id === row.job_id);
            if (job) {
                await db.update(jobs).set({
                    processed_rows: sql`${jobs.processed_rows} + 1`
                }).where(eq(jobs.job_id, job.job_id));
            }

            return { rowId: row.id, status: 'failed', error: errorMessage };
        }
    }));

    // Check for completed jobs after processing
    for (const job of activeJobs) {
        // Ensure status is running if it was pending and we processed something
        if (job.status === 'pending') {
            await db.update(jobs).set({ status: 'running' }).where(eq(jobs.job_id, job.job_id));
        }
    }

    return results;
}
