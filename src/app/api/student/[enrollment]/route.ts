import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ enrollment: string }> }
) {
  const { enrollment } = await params;
  const supabase = await createClient();

  if (!enrollment || enrollment.length < 4) {
    return NextResponse.json({ error: 'Invalid enrollment number' }, { status: 400 });
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*, departments(*)')
    .eq('enrollment_no', enrollment.toUpperCase())
    .eq('status', 'active')
    .single();

  if (studentError || !student) {
    return NextResponse.json(
      { error: 'Enrollment number not found. Please check and try again.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ student });
}
