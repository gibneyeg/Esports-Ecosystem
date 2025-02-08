import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { path } = await request.json();
    
    // Revalidate the requested path
    revalidatePath(path);
    
    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now(),
      message: `Revalidated ${path}`
    });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json({ 
      message: 'Error revalidating',
      error: err.message 
    }, { 
      status: 500 
    });
  }
}