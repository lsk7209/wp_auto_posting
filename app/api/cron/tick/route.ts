import { NextResponse } from 'next/server';
import { process_tick } from '@/services/manager';

export const maxDuration = 60; // Set max duration to 60 seconds (Vercel Hobby/Pro limit)
export const dynamic = 'force-dynamic'; // Ensure the route is not cached

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam, 10) : 2; // Default to 2 if not specified

        // Security check
        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await process_tick(limit);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in cron tick API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
