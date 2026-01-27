
import { NextResponse } from 'next/server';
import { DebugStore } from '@/lib/database/stored-procedures';

export async function GET() {
    return NextResponse.json({
        lastCall: DebugStore.lastCall,
        lastResult: DebugStore.lastResult,
        error: DebugStore.error,
        systemTime: new Date().toISOString()
    });
}
