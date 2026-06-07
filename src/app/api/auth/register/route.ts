import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hashPassword, validatePassword, validateEmail, validateDisplayName } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, password, displayName } = await request.json();

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }
    const normalizedEmail = emailValidation.normalizedEmail!;

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    // Validate display name
    const displayNameValidation = validateDisplayName(displayName);
    if (!displayNameValidation.valid) {
      return NextResponse.json({ error: displayNameValidation.error }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Sähköpostiosoite on jo käytössä" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: displayName.trim(),
        isAdmin: false,
      },
    });

    // Create session
    const token = await createSession({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
    });

    // Set cookie
    await setSessionCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isAdmin: user.isAdmin,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Rekisteröityminen epäonnistui" },
      { status: 500 }
    );
  }
}
