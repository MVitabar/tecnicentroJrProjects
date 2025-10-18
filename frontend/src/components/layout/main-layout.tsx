"use client"

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/contexts/auth-context";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authService } from "@/lib/auth/auth.service";

type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const [isClient, setIsClient] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();

  const publicRoutes = ["/login", "/register", "/forgot-password"];
  
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    const checkAuth = async () => {
      setIsClient(true);
      
      // Wait for auth state to be fully loaded
      if (loading) {
        return;
      }

      // If not authenticated and not on a public route, redirect to login
      if (!isAuthenticated && !isPublicRoute) {
        console.log('Not authenticated, redirecting to login');
        router.push("/login");
        return;
      }

      // If authenticated, check user permissions
      if (isAuthenticated) {
        const user = authService.getCurrentUser();
        if (!user) {
          console.log('No user found in localStorage, redirecting to login');
          router.push("/login");
          return;
        }

        const userRole = user.role || 'USER';
        const userRoutes = ["/dashboard/ventas", "/dashboard/servicios", "/dashboard/productos"];
        
        // Redirect USER role from dashboard root to ventas
        if (userRole === 'USER' && pathname === '/dashboard') {
          console.log('User role detected, redirecting to ventas');
          router.push('/dashboard/ventas');
          return;
        }
        
        // Check if current route is allowed for USER role
        const isUserRoute = userRoutes.some(route => 
          pathname === route || pathname.startsWith(`${route}/`)
        );
        
        if (userRole === 'USER' && !isUserRoute && !isPublicRoute) {
          console.log('User not authorized for this route, redirecting to ventas');
          router.push('/dashboard/ventas');
          return;
        }
      }
      
      // If we get here, auth check is complete
      console.log('Auth check complete');
      setAuthChecked(true);
    };

    checkAuth();
  }, [pathname, isAuthenticated, isPublicRoute, loading, router]);

  // Show loading spinner while checking auth
  if (!isClient || loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Handle public routes
  if (isPublicRoute) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Main authenticated layout
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