'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { QrCode, Send, Users, Clock, Eye, Zap, Download } from 'lucide-react';
import { setDApi, QRCodeResult } from '@/lib/api/set-d';

export default function QRBlastPage() {
    const [usnInput, setUsnInput] = useState('');
    const [expiryHours, setExpiryHours] = useState('24');
    const [includeCertificate, setIncludeCertificate] = useState(false);
    const [isBlasting, setIsBlasting] = useState(false);
    const [previewUSN, setPreviewUSN] = useState('');
    const [previewResult, setPreviewResult] = useState<QRCodeResult | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [blastResults, setBlastResults] = useState<{ message: string; users: string[] } | null>(null);

    // ── Preview a single QR code ─────────────────────────────────
    const handlePreview = async () => {
        if (!previewUSN.trim()) {
            toast.error("Enter a USN to preview");
            return;
        }
        setIsPreviewLoading(true);
        try {
            const result = await setDApi.generateQR(
                previewUSN.trim(),
                'hackodyssey2026',
                parseInt(expiryHours)
            );
            setPreviewResult(result);
            toast.success("QR code generated!");
        } catch (error: any) {
            toast.error(error.message || "Failed to generate QR preview");
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // ── Download QR as PNG ───────────────────────────────────────
    const downloadQR = () => {
        if (!previewResult) return;
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${previewResult.qr_base64}`;
        link.download = `${previewResult.usn}_qr_badge.png`;
        link.click();
    };

    // ── Blast QR Codes to all specified USNs ─────────────────────
    const handleBlast = async () => {
        const usns = usnInput
            .split(/[,\n]/)
            .map(u => u.trim())
            .filter(Boolean);

        if (usns.length === 0) {
            toast.error("Enter at least one USN");
            return;
        }

        setIsBlasting(true);
        try {
            const result = await setDApi.blastQRCodes({
                usns,
                event_id: 'hackodyssey2026',
                expiry_hours: parseInt(expiryHours),
                include_certificate: includeCertificate,
            });
            setBlastResults({ message: result.message, users: result.users_processed });
            toast.success(result.message);
        } catch (error: any) {
            toast.error(error.message || "Failed to blast QR codes");
        } finally {
            setIsBlasting(false);
        }
    };

    // ── Blast to ALL users ───────────────────────────────────────
    const handleBlastAll = async () => {
        setIsBlasting(true);
        try {
            const allUsers = await setDApi.listUsers();
            const usns = allUsers.map((u: any) => u.uid);

            if (usns.length === 0) {
                toast.error("No users found in the database");
                setIsBlasting(false);
                return;
            }

            const result = await setDApi.blastQRCodes({
                usns,
                event_id: 'hackodyssey2026',
                expiry_hours: parseInt(expiryHours),
                include_certificate: includeCertificate,
            });
            setBlastResults({ message: result.message, users: result.users_processed });
            toast.success(`${result.message} (All users)`);
        } catch (error: any) {
            toast.error(error.message || "Failed to blast QR codes to all users");
        } finally {
            setIsBlasting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">QR Badge Blast</h2>
                    <p className="text-muted-foreground">
                        Generate and email personalized QR attendance badges to participants.
                        Optionally attach participation certificates in the same email.
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">QR Blast Mode</CardTitle>
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {includeCertificate ? 'QR + Certificate' : 'QR Badge Only'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {includeCertificate
                                ? 'Each email will include QR badge + attached PDF certificate'
                                : 'Each email will include an inline QR attendance badge'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expiry Window</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiryHours}h</div>
                        <p className="text-xs text-muted-foreground">QR codes expire after this duration</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Blast</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {blastResults ? `${blastResults.users.length} sent` : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {blastResults ? blastResults.message : 'No blasts sent yet'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Left: Blast Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" /> Blast QR Codes
                        </CardTitle>
                        <CardDescription>
                            Enter USNs (comma or line separated) to email each one a personalized QR attendance badge.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>USNs (comma or newline separated)</Label>
                            <Textarea
                                placeholder={"1RV21CS001\n1RV21CS002\n1RV21IS045"}
                                className="min-h-[120px] font-mono text-sm"
                                value={usnInput}
                                onChange={e => setUsnInput(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                {usnInput.split(/[,\n]/).filter(u => u.trim()).length} USN(s) entered
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Expiry Duration</Label>
                                <Select value={expiryHours} onValueChange={setExpiryHours}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 hour</SelectItem>
                                        <SelectItem value="6">6 hours</SelectItem>
                                        <SelectItem value="12">12 hours</SelectItem>
                                        <SelectItem value="24">24 hours</SelectItem>
                                        <SelectItem value="48">48 hours</SelectItem>
                                        <SelectItem value="168">7 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Include Certificate</Label>
                                <p className="text-sm text-muted-foreground">
                                    Attach a participation certificate PDF in the same QR email.
                                </p>
                            </div>
                            <Switch checked={includeCertificate} onCheckedChange={setIncludeCertificate} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 border-t pt-4">
                        <Button
                            className="flex-1"
                            onClick={handleBlast}
                            disabled={isBlasting || !usnInput.trim()}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            {isBlasting ? 'Blasting...' : 'Blast QR Codes'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleBlastAll}
                            disabled={isBlasting}
                        >
                            <Users className="mr-2 h-4 w-4" />
                            {isBlasting ? 'Loading...' : 'Blast All Users'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Right: Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" /> Preview QR Badge
                        </CardTitle>
                        <CardDescription>
                            Generate and preview a QR code for a single USN before blasting.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter USN e.g. 1RV21CS001"
                                className="font-mono"
                                value={previewUSN}
                                onChange={e => setPreviewUSN(e.target.value)}
                            />
                            <Button onClick={handlePreview} disabled={isPreviewLoading} variant="secondary">
                                {isPreviewLoading ? 'Generating...' : 'Preview'}
                            </Button>
                        </div>

                        {previewResult && (
                            <div className="flex flex-col items-center space-y-4 pt-4">
                                <div className="bg-white p-4 rounded-xl shadow-md">
                                    <img
                                        src={`data:image/png;base64,${previewResult.qr_base64}`}
                                        alt={`QR Badge for ${previewResult.usn}`}
                                        className="w-48 h-48"
                                    />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="font-semibold">{previewResult.usn}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Event: {previewResult.event_id}
                                    </p>
                                    <Badge variant="outline" className="mt-1">
                                        <Clock className="mr-1 h-3 w-3" />
                                        Expires: {new Date(previewResult.expires_at).toLocaleString()}
                                    </Badge>
                                </div>
                                <Button variant="outline" size="sm" onClick={downloadQR}>
                                    <Download className="mr-2 h-3.5 w-3.5" /> Download PNG
                                </Button>
                            </div>
                        )}

                        {!previewResult && (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                <QrCode className="h-16 w-16 opacity-20 mb-4" />
                                <p className="text-sm">Enter a USN above and click Preview to see the generated QR badge.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Blast Results */}
            {blastResults && blastResults.users.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Last Blast Results</CardTitle>
                        <CardDescription>{blastResults.message}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {blastResults.users.map(usn => (
                                <Badge key={usn} variant="secondary" className="font-mono text-xs">
                                    {usn}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
