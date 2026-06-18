import { AppShell } from "@/components/shell/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { BoardsProvider } from "@/lib/boards-context";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <BoardsProvider>
        <AppShell>{children}</AppShell>
      </BoardsProvider>
    </AuthGuard>
  );
}
