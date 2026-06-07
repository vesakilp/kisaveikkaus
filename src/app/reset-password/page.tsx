import ResetPasswordForm from "./reset-password-form";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 sm:py-12">
      <ResetPasswordForm token={token} />
    </div>
  );
}
