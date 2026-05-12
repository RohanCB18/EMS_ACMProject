'use client';

import React from 'react';
import { Bell, Menu, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

interface HeaderProps {
    role?: 'admin' | 'participant' | 'judge' | 'volunteer';
}

export function Header({ role = 'participant' }: HeaderProps) {
    const router = useRouter();
    const { profile, signOut } = useAuth();
    const displayName = profile?.display_name || 'Guest User';
    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0].toUpperCase())
        .slice(0, 2)
        .join('') || 'GU';

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Sheet>
                <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs p-0">
                    <Sidebar role={role} className="block w-full border-r-0" />
                </SheetContent>
            </Sheet>

            <div className="flex md:hidden w-full items-center gap-2 font-semibold">
                <span className="text-lg">Hackathon EMS</span>
            </div>

            <div className="relative ml-auto flex-1 md:grow-0 hidden sm:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                />
            </div>

            <div className="flex items-center gap-4 ml-auto sm:ml-0">
                <div className="hidden text-sm font-medium border rounded-full px-3 py-1 bg-yellow-100/50 text-yellow-800 border-yellow-200 lg:block">
                    Phase: Registration Open
                </div>

                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600"></span>
                    <span className="sr-only">Notifications</span>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src="" alt="User" />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <span className="sr-only">Toggle user menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                        <div className="px-3 py-1 text-xs text-muted-foreground">{profile?.role ?? 'No role selected'}</div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => router.push('/dashboard/profile')}>
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push('/dashboard/announcements')}>
                            Announcements
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={async () => {
                            await signOut();
                            router.push('/auth/login');
                        }}>
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
