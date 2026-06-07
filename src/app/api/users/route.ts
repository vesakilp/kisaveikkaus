import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    // Require admin access
    await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Vain adminit voivat nähdä käyttäjät" }, { status: 403 });
    }
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Käyttäjien haku epäonnistui" },
      { status: 500 }
    );
  }
}
