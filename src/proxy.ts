import NextAuth from "next-auth"
import authConfig from "@/lib/auth.config"

export const { auth } = NextAuth(authConfig)

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard")
    const isOnAuthorize = req.nextUrl.pathname.startsWith("/authorize")
    const isOnAuthRoute = req.nextUrl.pathname === "/" // Nasz login page

    // 1. Ochrona Dashboardu i Authorize
    if (isOnDashboard || isOnAuthorize) {
        if (isLoggedIn) return // Zalogowany -> OK
        // Niezalogowany -> Przekieruj na Login z zapamiętaniem URL
        const callbackUrl = encodeURIComponent(req.nextUrl.href);
        return Response.redirect(new URL(`/?callbackUrl=${callbackUrl}`, req.nextUrl))
    }

    // 2. Obsługa strony logowania (Gdy już zalogowany)
    if (isOnAuthRoute) {
        if (isLoggedIn) {
            // Jeśli jest parametr callbackUrl (np. z /authorize), idź tam
            const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
            if (callbackUrl) {
                return Response.redirect(new URL(callbackUrl, req.nextUrl));
            }
            // Domyślnie na dashboard
            return Response.redirect(new URL("/dashboard", req.nextUrl))
        }
        return // Niezalogowany na stronie logowania -> OK
    }

    return
})

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
