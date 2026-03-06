"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QrCode, UserCheck, Shield } from "lucide-react";

export default function CheckInPage() {
    const [qrCode, setQrCode] = useState("");
    const [phaseId, setPhaseId] = useState("registration");
    const [loading, setLoading] = useState(false);

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qrCode) return;

        setLoading(true);
        try {
            // API call to backend would go here
            // For now, we simulate success
            await new Promise(resolve => setTimeout(resolve, 800));
            toast.success(`Participant ${qrCode} checked in successfully for ${phaseId}!`);
            setQrCode("");
        } catch (error) {
            toast.error("Failed to check in participant.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">QR Check-In</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Manual / Scanner Input</CardTitle>
                        <CardDescription>
                            Scan participant QR code or enter UID manually.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCheckIn} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phase</label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={phaseId}
                                    onChange={(e) => setPhaseId(e.target.value)}
                                >
                                    <option value="registration">Registration Entry</option>
                                    <option value="launch">Initial Launch</option>
                                    <option value="phase1">Phase 1 Submission</option>
                                    <option value="finale">Grand Finale</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">QR Data / UID</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Scan or type UID..."
                                        value={qrCode}
                                        onChange={(e) => setQrCode(e.target.value)}
                                        autoFocus
                                    />
                                    <Button type="submit" disabled={loading}>
                                        {loading ? "Checking..." : "Check In"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Session Stats</CardTitle>
                        <CardDescription>Real-time attendance tracking.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 p-3 border rounded-lg bg-green-50 dark:bg-green-900/10">
                            <UserCheck className="w-8 h-8 text-green-600" />
                            <div>
                                <div className="text-2xl font-bold">142</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Checked In</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 border rounded-lg">
                            <QrCode className="w-8 h-8 text-blue-600" />
                            <div>
                                <div className="text-2xl font-bold">85%</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Attendance Rate</div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Recent Scans
                            </h4>
                            <ul className="text-sm space-y-2">
                                <li className="flex justify-between"><span>user_abc123</span> <span className="text-muted-foreground">2m ago</span></li>
                                <li className="flex justify-between"><span>user_xyz987</span> <span className="text-muted-foreground">5m ago</span></li>
                                <li className="flex justify-between"><span>user_def456</span> <span className="text-muted-foreground">12m ago</span></li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
