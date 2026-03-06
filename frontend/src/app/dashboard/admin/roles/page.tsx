"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, UserCog } from "lucide-react";

export default function RolesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Control Center</h1>
                    <p className="text-muted-foreground">Manage user roles and permissions (RBAC).</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users..." className="pl-8" />
                </div>
                <Button variant="outline">Filter Roles</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserCog className="w-5 h-5" /> Role Assignment Panel
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User Email</TableHead>
                                <TableHead>Current Role</TableHead>
                                <TableHead>Joined Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                { email: "rohan@example.com", role: "Super Admin", date: "Jan 12, 2024" },
                                { email: "aditya@example.com", role: "Organizer", date: "Jan 15, 2024" },
                                { email: "aparna@example.com", role: "Organizer", date: "Jan 15, 2024" },
                                { email: "judge.sam@example.com", role: "Judge", date: "Mar 01, 2024" },
                                { email: "mentor.jane@example.com", role: "Mentor", date: "Feb 20, 2024" },
                                { email: "volunteer.max@example.com", role: "Volunteer", date: "Mar 05, 2024" },
                            ].map((user) => (
                                <TableRow key={user.email}>
                                    <TableCell className="font-medium">{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === "Super Admin" ? "destructive" : user.role === "Organizer" ? "default" : "secondary"}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.date}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Modify Role</Button>
                                        <Button variant="ghost" size="sm" className="text-red-500">Revoke</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50/20">
                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                    <ShieldAlert className="w-5 h-5 text-yellow-600" />
                    <CardTitle className="text-lg">Security Note</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Role changes are audit-logged and take effect upon next user login.
                        Only Super Admins can assign the <strong>Super Admin</strong> or <strong>Organizer</strong> roles.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
