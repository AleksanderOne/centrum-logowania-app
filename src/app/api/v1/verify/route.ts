import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/drizzle";
import { projects, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
    try {
        // 1. Walidacja API Key
        const apiKey = req.headers.get("x-api-key");

        if (!apiKey) {
            return NextResponse.json(
                { error: "Missing API Key" },
                { status: 401 }
            );
        }

        const project = await db.query.projects.findFirst({
            where: eq(projects.apiKey, apiKey)
        });

        if (!project) {
            return NextResponse.json(
                { error: "Invalid API Key" },
                { status: 403 }
            );
        }

        // 2. Pobranie tokenu z body
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json(
                { error: "Missing token" },
                { status: 400 }
            );
        }

        // 3. Dekodowanie i weryfikacja tokenu (JWE)
        const secret = process.env.NEXTAUTH_SECRET!;

        // Próbujemy najpierw standardowy salt (dla HTTP/localhost)
        let decodedToken = await decode({
            token,
            secret,
            salt: "authjs.session-token",
        });

        // Jeśli się nie udało, próbujemy salt produkcyjny (dla HTTPS/Vercel)
        if (!decodedToken) {
            decodedToken = await decode({
                token,
                secret,
                salt: "__Secure-authjs.session-token",
            });
        }

        if (!decodedToken) {
            return NextResponse.json(
                { error: "Invalid token" },
                { status: 401 }
            );
        }

        // 4. Sprawdzenie wygasnięcia (exp)
        if (decodedToken.exp && Date.now() / 1000 > decodedToken.exp) {
            return NextResponse.json(
                { error: "Token expired" },
                { status: 401 }
            );
        }

        // 5. Sprawdzenie wersji tokenu (Kill Switch)
        if (decodedToken.sub) {
            const user = await db.query.users.findFirst({
                where: eq(users.id, decodedToken.sub)
            });

            // @ts-ignore - tokenVersion może nie być w typach decodedToken domyślnie
            const tokenVersion = decodedToken.tokenVersion as number | undefined;

            if (!user || (user.tokenVersion && user.tokenVersion !== (tokenVersion || 1))) {
                return NextResponse.json(
                    { error: "Token revoked" },
                    { status: 401 }
                );
            }

            // 6. Sukces - zwracamy dane użytkownika
            return NextResponse.json({
                valid: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role
                },
                project: {
                    id: project.id,
                    name: project.name
                }
            });
        }

        return NextResponse.json(
            { error: "Invalid token structure" },
            { status: 400 }
        );

    } catch (error) {
        console.error("Token verification error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
