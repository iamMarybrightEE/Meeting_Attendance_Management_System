import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request) {
  try {
    // Test if we can connect to the database
    const { data, error } = await supabaseAdmin
      .from('meetings')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      return Response.json({
        status: 'error',
        message: 'Database query failed',
        details: error.message,
        hint: error.hint,
        code: error.code,
      }, { status: 500 });
    }

    return Response.json({
      status: 'ok',
      message: 'Database connection successful',
      meetingsCount: data?.length || 0,
    });
  } catch (err) {
    return Response.json({
      status: 'error',
      message: 'Server error',
      details: err.message,
    }, { status: 500 });
  }
}
