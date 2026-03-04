import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const { action, days, weeks } = await req.json();

        let command = '';

        switch (action) {
            case 'fetch-daily':
                command = 'npx tsx scripts/gsc/fetch-daily.ts';
                break;
            case 'backfill':
                command = `npx tsx scripts/gsc/backfill.ts --days=${days || 14}`;
                break;
            case 'build-weekly':
                command = `npx tsx scripts/gsc/build-weekly-summary.ts --weeks=${weeks || 8}`;
                break;
            default:
                return NextResponse.json({ success: false, error: 'Geçersiz işlem' }, { status: 400 });
        }

        console.log(`[Sync API] Running command: ${command}`);

        // Execute the command
        const { stdout, stderr } = await execPromise(command);

        if (stderr && !stdout) {
            console.error(`[Sync API] Error: ${stderr}`);
            return NextResponse.json({ success: false, error: stderr });
        }

        return NextResponse.json({
            success: true,
            data: {
                message: 'İşlem başarıyla tamamlandı.',
                output: stdout,
                error: stderr
            }
        });

    } catch (error: any) {
        console.error('[Sync API] Fatal Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
