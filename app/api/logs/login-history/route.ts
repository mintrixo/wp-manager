import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';

/**
 * GET /api/logs/login-history
 * Get login history for current user or all users (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let sql = 'SELECT * FROM login_logs WHERE 1=1';
    const params: any[] = [];

    // Regular users can only see their own login history
    if (decoded.role !== 'super_admin') {
      sql += ' AND user_id = ?';
      params.push(decoded.userId);
    }

    // Admins can filter by user or success/failure
    if (decoded.role === 'super_admin') {
      const userId = searchParams.get('userId');
      const successOnly = searchParams.get('success');

      if (userId) {
        sql += ' AND user_id = ?';
        params.push(userId);
      }

      if (successOnly === 'true') {
        sql += ' AND success = true';
      } else if (successOnly === 'false') {
        sql += ' AND success = false';
      }
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logins = await query<any>(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM login_logs WHERE 1=1';
    const countParams: any[] = [];

    if (decoded.role !== 'super_admin') {
      countSql += ' AND user_id = ?';
      countParams.push(decoded.userId);
    }

    const countResult = await queryOne<{ count: number }>(countSql, countParams);
    const total = countResult?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        logins: logins.map((log: any) => ({
          ...log,
          // Hide sensitive details for non-admins
          ...(decoded.role !== 'super_admin' && {
            user_agent: log.user_agent?.substring(0, 50),
          }),
        })),
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[LOGS] Login history error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch login history' },
      { status: 500 }
    );
  }
}
