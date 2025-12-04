import { NextResponse } from 'next/server';
import { dispatch_job } from '@/services/manager';
import * as xlsx from 'xlsx';

export const maxDuration = 60; // Set max duration to 60 seconds

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const site_id = formData.get('site_id') as string;
        const text_model_id = formData.get('text_model_id') as string;
        const image_model_id = formData.get('image_model_id') as string;
        const excelFile = formData.get('excel_file') as File;
        const system_prompt = formData.get('system_prompt') as string;

        if (!excelFile) {
            return NextResponse.json({ error: 'Excel file is required' }, { status: 400 });
        }

        const buffer = await excelFile.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        const jobId = await dispatch_job({
            site_id,
            text_model_id,
            image_model_id,
            rows,
            system_prompt,
        });

        return NextResponse.json({ job_id: jobId, message: 'Job created successfully' });
    } catch (error) {
        console.error('Error in publish API:', error);
        return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }
}
