"use client"

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  const publicRoutes = ["/login", "/register", "/forgot-password"];

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    setIsClient(true);
    if (!loading && !isAuthenticated && !isPublicRoute) {
      router.push("/login");
    }
  }, [pathname, isAuthenticated, isPublicRoute, loading, router]);

  if (!isClient || loading) {
    return <div>Cargando...</div>;
  }

  if (isPublicRoute) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex flex-1 md:pl-64">
        <AppSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}