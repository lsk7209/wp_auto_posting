import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sites } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const allSites = await db.select().from(sites);
        // Don't return full app password in list if possible, or maybe it's fine for this MVP
        return NextResponse.json(allSites);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, url, username, app_password, id: providedId } = body;

        if (!name || !url || !username || !app_password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const id = providedId || uuidv4();

        await db.insert(sites).values({
            id,
            name,
            url,
            username,
            app_password,
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Error adding site:', error);
        return NextResponse.json({ error: 'Failed to add site' }, { status: 500 });
    }
}
