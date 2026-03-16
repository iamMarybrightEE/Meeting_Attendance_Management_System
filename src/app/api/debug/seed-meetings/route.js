import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAuth } from '@/lib/authMiddleware';

// This endpoint creates test meetings only for debugging
// Should be removed before production
export async function POST(request) {
  const { user, error: authError } = await verifyAuth(request);
  if (authError) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user profile to check if admin
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.roles?.name === 'System Administrator' || userProfile?.roles?.name === 'Admin';
    if (!isAdmin) {
      return Response.json({ error: 'Only admins can seed test data' }, { status: 403 });
    }

    // Create test meetings
    const today = new Date();
    const testMeetings = [
      {
        title: 'Q1 Planning Meeting',
        description: 'Quarterly planning and strategy discussion',
        date: today.toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '10:30',
        type: 'management',
        category: 'internal',
        organizer_id: user.id,
        location: 'Conference Room A',
        status: 'scheduled',
      },
      {
        title: 'Team Standup',
        description: 'Daily team sync',
        date: today.toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '10:30',
        type: 'team',
        category: 'internal',
        organizer_id: user.id,
        location: 'Virtual',
        status: 'scheduled',
      },
      {
        title: 'Budget Review',
        description: 'Review departmental budget allocation',
        date: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
        start_time: '14:00',
        end_time: '15:30',
        type: 'management',
        category: 'internal',
        organizer_id: user.id,
        location: 'Director\'s Office',
        status: 'scheduled',
      },
    ];

    const { data: createdMeetings, error: insertError } = await supabaseAdmin
      .from('meetings')
      .insert(testMeetings)
      .select();

    if (insertError) {
      return Response.json({
        error: 'Failed to seed test data',
        details: insertError.message,
      }, { status: 500 });
    }

    return Response.json({
      message: 'Test data created successfully',
      meetings: createdMeetings,
    });
  } catch (err) {
    return Response.json({
      error: 'Server error',
      details: err.message,
    }, { status: 500 });
  }
}
