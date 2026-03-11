import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const basicAuth = request.headers.get('authorization');

    // Load password from environment, default to something if not set (for safety against accidental lockouts, or just require it)
    // We recommend the user to set ADMIN_PASSWORD in their environment variables (.env / Railway vars)
    const password = process.env.ADMIN_PASSWORD;

    // If no password is set in the environment, we can either block all or allow all.
    // For safety and ease of use during development, if there's no ADMIN_PASSWORD, we can bypass.
    // But strictly speaking, we want to protect it, so we'll enforce it if it's set.
    if (!password) {
        // If you want to force password even locally, remove this check.
        // However, it's safer to skip auth if no password is set so development isn't broken
        // before the user configures it.
        console.warn('ADMIN_PASSWORD is not set. Basic Auth is disabled.');
        return NextResponse.next();
    }

    if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');

        // We can just check the password, or both user and password.
        // A simple global password check:
        if (pwd === password) {
            return NextResponse.next();
        }
    }

    return new NextResponse('Auth required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    });
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/webhook (if you have public webhooks)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
