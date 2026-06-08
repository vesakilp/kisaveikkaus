import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, requireAuth, setSessionCookie } from "@/lib/auth/session";
import { validateDisplayName } from "@/lib/auth/password";

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const { displayName } = await request.json();

    const validation = validateDisplayName(displayName);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: { displayName: displayName.trim() },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
      },
    });

    const token = await createSession(user);
    await setSessionCookie(token);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
    }

    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Näyttönimen päivitys epäonnistui" }, { status: 500 });
  }
}
