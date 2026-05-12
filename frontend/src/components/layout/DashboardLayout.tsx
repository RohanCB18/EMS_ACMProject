import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
    children: React.ReactNode;
    role?: 'admin' | 'participant' | 'judge' | 'mentor';
}

export function DashboardLayout({ children, role = 'participant' }: DashboardLayoutProps) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/20">
            <div className="flex flex-1">
                <Sidebar role={role} />
                <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-4 w-full">
                    <Header />
                    <main className="flex-1 p-4 md:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
