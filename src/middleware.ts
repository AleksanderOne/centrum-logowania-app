import { auth } from "@/lib/auth"
import { NextResponse } from "next/server";

export default auth((req) => {
    const isLoggedIn = !!req.auth;
    const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

    if (isDashboard && !isLoggedIn) {
        return NextResponse.redirect(new URL("/", req.url));
    }
})

export const config = {
    // Uruchamiaj middleware tylko dla ścieżek, które tego wymagają
    // Pomijamy static files, api (oprócz verify jeśli trzeba, ale verify jest public), images etc.
    matcher: ["/dashboard/:path*"],
};
