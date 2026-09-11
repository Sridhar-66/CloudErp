import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected route paths
  const protectedPrefixes = [
    '/dashboard', '/admissions', '/fees', '/attendance',
    '/exams', '/timetable', '/library', '/hostel',
    '/transport', '/hr-payroll', '/placements', '/notices', '/users'
  ]

  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p))
  const isAuthPage = pathname === '/login' || pathname === '/'

  // Check if any supabase auth cookies exist
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(c => c.name.includes('auth-token') || c.name.includes('sb-'))

  // Fast path 1: Unauthenticated request to protected route without auth cookies -> instant redirect to /login
  if (isProtected && !hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Fast path 2: Unauthenticated request to public/auth pages without auth cookies -> return next immediately (0 network calls)
  if (!isProtected && isAuthPage && !hasAuthCookie) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Wrap getUser in a 3s timeout to handle remote Supabase network latency safely
  let user = null
  try {
    const getUserPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 3000)
    )
    const res = await Promise.race([getUserPromise, timeoutPromise])
    user = res.data?.user ?? null
  } catch (err) {
    user = null
  }

  // Protect dashboard routes
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

