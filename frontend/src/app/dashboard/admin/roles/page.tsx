"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert, UserCog, MoreVertical } from "lucide-react";
import { setDApi, UserRole } from "@/lib/api/set-d";
import { toast } from "sonner";
import { useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function RolesPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchUsers = async () => {
        try {
            const data = await setDApi.listUsers();
            setUsers(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdateRole = async (uid: string, newRole: UserRole) => {
        try {
            await setDApi.updateUserRole(uid, newRole);
            toast.success(`Role updated successfully`);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message || "Failed to update role");
        }
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div>Loading users...</div>;

    const roles: UserRole[] = ["super_admin", "organizer", "judge", "mentor", "volunteer", "participant"];

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
                    <Input
                        placeholder="Search users..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
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
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user.uid}>
                                    <TableCell className="font-medium">{user.email || user.uid}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === "super_admin" ? "destructive" : user.role === "organizer" ? "default" : "secondary"}>
                                            {user.role?.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Assign New Role</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {roles.map(role => (
                                                    <DropdownMenuItem
                                                        key={role}
                                                        onClick={() => handleUpdateRole(user.uid, role)}
                                                        className={user.role === role ? "bg-accent" : ""}
                                                    >
                                                        {role.replace('_', ' ')}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredUsers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No users found</TableCell>
                                </TableRow>
                            )}
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
