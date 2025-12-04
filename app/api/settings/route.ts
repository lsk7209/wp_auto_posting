import { NextResponse } from 'next/server';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const apiKeyRecord = await db.select().from(settings).where(eq(settings.key, 'gemini_api_key')).get();
        const hasKey = !!apiKeyRecord?.value;

        // Return masked key or just status
        return NextResponse.json({
            has_key: hasKey,
            masked_key: hasKey ? '****************' : null
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { key, value } = await request.json();

        if (key !== 'gemini_api_key') {
            return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 });
        }

        await db.insert(settings).values({ key, value })
            .onConflictDoUpdate({ target: settings.key, set: { value, updated_at: new Date() } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { key } = await request.json();
        if (key !== 'gemini_api_key') {
            return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 });
        }

        await db.delete(settings).where(eq(settings.key, key));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
    }
}
