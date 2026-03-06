"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QrCode, UserCheck, Shield, Camera } from "lucide-react";
import { setDApi, AttendanceRecord } from "@/lib/api/set-d";
import QrScanner from 'react-qr-scanner';
import { useEffect } from "react";

export default function CheckInPage() {
    const [qrCode, setQrCode] = useState("");
    const [phaseId, setPhaseId] = useState("registration");
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [stats, setStats] = useState({ total_present: 0, attendance_rate: 0, recent: [] as AttendanceRecord[] });

    const fetchStats = async () => {
        try {
            const data = await setDApi.getAttendanceStats(phaseId);
            setStats({
                total_present: data.total_present,
                attendance_rate: 85, // Mock rate calculation for now
                recent: data.records.slice(-5).reverse()
            });
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [phaseId]);

    const handleCheckIn = async (code: string) => {
        if (!code) return;
        setLoading(true);
        try {
            await setDApi.checkIn(code, phaseId);
            toast.success(`Checked in successfully!`);
            setQrCode("");
            setShowScanner(false);
            fetchStats();
        } catch (error: any) {
            toast.error(error.message || "Failed to check in.");
        } finally {
            setLoading(false);
        }
    };

    const handleScan = (data: { text: string } | null) => {
        if (data) {
            handleCheckIn(data.text);
        }
    };

    const handleError = (err: any) => {
        console.error(err);
        toast.error("Scanner error");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">QR Check-In</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            Manual / Scanner Input
                            <Button variant="outline" size="sm" onClick={() => setShowScanner(!showScanner)}>
                                <Camera className="w-4 h-4 mr-2" />
                                {showScanner ? "Close Scanner" : "Open Scanner"}
                            </Button>
                        </CardTitle>
                        <CardDescription>
                            Scan participant QR code or enter UID manually.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {showScanner ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="border-4 border-primary rounded-xl overflow-hidden bg-black aspect-square w-full max-w-[300px]">
                                    <QrScanner
                                        delay={300}
                                        onError={handleError}
                                        onScan={handleScan}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground animate-pulse">Scanning for QR code...</p>
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleCheckIn(qrCode); }} className="space-y-4">
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
                        )}
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
                                <div className="text-2xl font-bold">{stats.total_present}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Checked In</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 border rounded-lg">
                            <QrCode className="w-8 h-8 text-blue-600" />
                            <div>
                                <div className="text-2xl font-bold">{stats.attendance_rate}%</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider">Attendance Rate</div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Recent Scans
                            </h4>
                            <ul className="text-sm space-y-2">
                                {stats.recent.map((rec, i) => (
                                    <li key={i} className="flex justify-between">
                                        <span>{rec.uid}</span>
                                        <span className="text-muted-foreground text-xs">{new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </li>
                                ))}
                                {stats.recent.length === 0 && (
                                    <li className="text-muted-foreground text-xs italic">No scans recorded yet</li>
                                )}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
