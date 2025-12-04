import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';


export async function GET() {
    try {
        const modelsPath = path.join(process.cwd(), 'data', 'models.json');
        const modelsRaw = await fs.readFile(modelsPath, 'utf-8');
        const models = JSON.parse(modelsRaw);
        return NextResponse.json(models);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}
