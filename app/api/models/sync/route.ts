import { NextResponse } from 'next/server';
import { sync_models } from '@/services/ai_service';

export const dynamic = 'force-dynamic';


export async function POST() {
    try {
        const models = await sync_models();
        return NextResponse.json(models);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to sync models' }, { status: 500 });
    }
}
