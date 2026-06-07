import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword, validatePassword, validateDisplayName } from "@/lib/auth/password";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Käyttäjää ei löydy" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Vain adminit voivat nähdä käyttäjätiedot" }, { status: 403 });
    }
    return NextResponse.json({ error: "Virhe käyttäjän haussa" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const userId = Number(id);

    // Validate data
    if (body.displayName) {
      const validation = validateDisplayName(body.displayName);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    if (body.password) {
      const validation = validatePassword(body.password);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Prevent non-superadmin from modifying their own admin status
    if (body.isAdmin !== undefined && userId === session.id) {
      return NextResponse.json(
        { error: "Et voi muuttaa omaa admin-statustasi" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: { displayName?: string; isAdmin?: boolean; passwordHash?: string } = {};
    if (body.displayName) updateData.displayName = body.displayName.trim();
    if (body.isAdmin !== undefined) updateData.isAdmin = body.isAdmin;
    if (body.password) {
      updateData.passwordHash = await hashPassword(body.password);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        isAdmin: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Vain adminit voivat muokata käyttäjiä" }, { status: 403 });
    }
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Käyttäjän päivitys epäonnistui" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const userId = Number(id);

    // Prevent self-deletion
    if (userId === session.id) {
      return NextResponse.json(
        { error: "Et voi poistaa omaa käyttäjätiliäsi" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ error: "Vain adminit voivat poistaa käyttäjiä" }, { status: 403 });
    }
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Käyttäjän poisto epäonnistui" }, { status: 500 });
  }
}
