'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBadge, Send, CopyCheck, FileKey2, FileDown, Layers, History, MailCheck, ShieldAlert, Plus, Trash2, X, QrCode } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner"
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchApi } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Recipient {
    id: string;
    name: string;
    email: string;
    role: string;
    track: string;
    project_name: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AutomationDashboard() {
    const [activeTab, setActiveTab] = useState('certificates');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendWithCert, setSendWithCert] = useState(false);

    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [emailTo, setEmailTo] = useState("");
    const [isFetchingEmails, setIsFetchingEmails] = useState(false);
    const [emailSegment, setEmailSegment] = useState("custom");

    // Certificate recipient list from DB
    const [targetSegment, setTargetSegment] = useState("all");
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [recipients, setRecipients] = useState<Recipient[]>([]);

    // Single / preview cert form
    const [previewName, setPreviewName] = useState('');
    const [previewRole, setPreviewRole] = useState('Participant');
    const [previewTrack, setPreviewTrack] = useState('General');
    const [previewProject, setPreviewProject] = useState('');

    // QR Badge Blast state
    const [qrEmails, setQrEmails] = useState('');
    const [qrExpiry, setQrExpiry] = useState(24);
    const [isBlasting, setIsBlasting] = useState(false);
    const [qrIncludeCert, setQrIncludeCert] = useState(true);

    // ── Fetch Users from Firebase ────────────────────────────────────────────

    const fetchUsersFromDb = async () => {
        setIsFetchingUsers(true);
        try {
            let roleQuery = "";
            if (targetSegment === "all") {
                roleQuery = "?role=participant";
            } else if (targetSegment === "winners") {
                roleQuery = "?role=winner";
            } else {
                toast.error("Invalid segment selected");
                setIsFetchingUsers(false);
                return;
            }

            const querySnapshot: any[] = await fetchApi(`/api/admin/users${roleQuery}`);
            const fetchedRecipients: Recipient[] = [];
            
            querySnapshot.forEach((data) => {
                if (data.email && data.display_name) {
                    fetchedRecipients.push({
                        id: data.uid,
                        name: data.display_name,
                        email: data.email,
                        role: data.role === "winner" ? "Winner" : "Participant",
                        track: data.track || "General",
                        project_name: data.project_name || ""
                    });
                }
            });

            setRecipients(fetchedRecipients);
            toast.success(`Fetched ${fetchedRecipients.length} users from the database.`);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to fetch users from the database.");
        } finally {
            setIsFetchingUsers(false);
        }
    };

    const fetchEmailsFromDb = async (role: string) => {
        if (role === "custom") {
            setEmailTo("");
            return;
        }
        setIsFetchingEmails(true);
        try {
            const querySnapshot: any[] = await fetchApi(`/api/admin/users?role=${role}`);
            const emails: string[] = [];
            querySnapshot.forEach((data) => {
                if (data.email) emails.push(data.email);
            });
            
            if (emails.length === 0) {
                toast.warning(`No users found with role: ${role}`);
                setEmailTo("");
            } else {
                setEmailTo(emails.join(", "));
                toast.success(`Fetched ${emails.length} ${role}(s) from the database.`);
            }
        } catch (error) {
            console.error("Error fetching emails:", error);
            toast.error("Failed to fetch emails from the database.");
        } finally {
            setIsFetchingEmails(false);
        }
    };

    // ── Preview / Single PDF download ────────────────────────────────────────

    const handlePreview = async () => {
        if (!previewName.trim()) {
            toast.error("Please enter a name to preview the certificate");
            return;
        }
        setIsGenerating(true);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${API_BASE}/api/automation/certificates/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: previewName.trim(),
                    role: previewRole,
                    track: previewTrack,
                    project_name: previewProject.trim(),
                })
            });

            if (!response.ok) throw new Error("Failed to generate certificate");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${previewName.replace(/ /g, '_')}_Certificate.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(`Certificate for ${previewName} downloaded!`);
        } catch (error) {
            toast.error("Error connecting to backend API");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Bulk generate & email ────────────────────────────────────────────────

    const handleBulkGenerate = async () => {
        if (recipients.length === 0) {
            toast.error("Please fetch recipients from the database first.");
            return;
        }

        setIsGenerating(true);
        let successCount = 0;
        let failCount = 0;

        for (const recipient of recipients) {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const response = await fetch(`${API_BASE}/api/automation/email/blast`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to_emails: [recipient.email],
                        subject: `🏆 Your HackOdyssey 2026 Certificate — ${recipient.role}`,
                        body: `<h2>Congratulations, ${recipient.name}!</h2>
                               <p>Your certificate for participating as a <strong>${recipient.role}</strong> in the 
                               <strong>${recipient.track}</strong> track at HackOdyssey 2026 is attached.</p>
                               ${recipient.project_name ? `<p>Project: <em>${recipient.project_name}</em></p>` : ''}
                               <p>Thank you for being part of this amazing journey!</p>
                               <p>— Team HackOdyssey</p>`,
                        include_certificate_for: recipient.name,
                        role: recipient.role,
                        track: recipient.track,
                        project_name: recipient.project_name,
                    })
                });

                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setIsGenerating(false);
        if (successCount > 0) toast.success(`Certificates sent to ${successCount} recipient(s)!`);
        if (failCount > 0) toast.error(`Failed to send to ${failCount} recipient(s)`);
    };

    // ── Email blast ──────────────────────────────────────────────────────────

    const handleEmailBlast = async () => {
        if (!emailSubject.trim() || !emailBody.trim() || !emailTo.trim()) {
            toast.error("Please fill in all fields including recipient emails");
            return;
        }

        const toEmails = emailTo.split(',').map(e => e.trim()).filter(Boolean);
        if (toEmails.length === 0) {
            toast.error("Enter at least one valid email address");
            return;
        }

        setIsSending(true);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${API_BASE}/api/automation/email/blast`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to_emails: toEmails,
                    subject: emailSubject.trim(),
                    body: emailBody.trim(),
                    include_certificate_for: sendWithCert ? "Participant" : null,
                })
            });

            if (!response.ok) throw new Error("Failed to send");
            const data = await response.json();
            toast.success(data.message || `Email queued to ${toEmails.length} recipient(s)!`);
            setEmailSubject("");
            setEmailBody("");
            setEmailTo("");
        } catch (error) {
            toast.error("Error connecting to backend email API");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    // ── QR Badge Blast ───────────────────────────────────────────────────────

    const handleQrBlast = async () => {
        const emails = qrEmails.split(/[\n,]/).map(e => e.trim()).filter(Boolean);
        if (emails.length === 0) {
            toast.error("Enter at least one email");
            return;
        }
        setIsBlasting(true);
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${API_BASE}/api/checkin/attendance/qr-blast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usns: emails,
                    event_id: 'hackodyssey2026',
                    expiry_hours: qrExpiry,
                    include_certificate: qrIncludeCert,
                }),
            });
            if (!response.ok) throw new Error('Blast failed');
            const data = await response.json();
            toast.success(data.message || `QR badges sent to ${emails.length} email(s)!`);
            setQrEmails('');
        } catch (error) {
            toast.error('Failed to send QR badges');
            console.error(error);
        } finally {
            setIsBlasting(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Post-Event Automation</h2>
                    <p className="text-muted-foreground">Automate certificate generation, bulk emails, and feedback forms.</p>
                </div>
            </div>



            <Tabs defaultValue="certificates" onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
                    <TabsTrigger value="certificates">Certificate Engine</TabsTrigger>
                    <TabsTrigger value="communications">Email Blaster</TabsTrigger>
                    <TabsTrigger value="qr-blast">QR Badge Blast</TabsTrigger>
                </TabsList>

                {/* ── Certificate Engine Tab ─────────────────────────────── */}
                <TabsContent value="certificates" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">

                        {/* Preview / Single certificate */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><FileDown className="h-5 w-5" /> Preview Certificate</CardTitle>
                                <CardDescription>Generate and download a single PDF to preview the design.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Recipient Name</Label>
                                    <Input placeholder="e.g. Rohan" value={previewName} onChange={e => setPreviewName(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Select value={previewRole} onValueChange={setPreviewRole}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Participant">Participant</SelectItem>
                                                <SelectItem value="Winner">Winner</SelectItem>
                                                <SelectItem value="Runner Up">Runner Up</SelectItem>
                                                <SelectItem value="Mentor">Mentor</SelectItem>
                                                <SelectItem value="Judge">Judge</SelectItem>
                                                <SelectItem value="Volunteer">Volunteer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Track</Label>
                                        <Select value={previewTrack} onValueChange={setPreviewTrack}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="General">General</SelectItem>
                                                <SelectItem value="AI/ML">AI/ML</SelectItem>
                                                <SelectItem value="Web3">Web3</SelectItem>
                                                <SelectItem value="HealthTech">HealthTech</SelectItem>
                                                <SelectItem value="FinTech">FinTech</SelectItem>
                                                <SelectItem value="Open Innovation">Open Innovation</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Project Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    <Input placeholder="e.g. Antigravity EMS" value={previewProject} onChange={e => setPreviewProject(e.target.value)} />
                                </div>
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button className="w-full" onClick={handlePreview} disabled={isGenerating}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    {isGenerating ? 'Generating...' : 'Download Preview PDF'}
                                </Button>
                            </CardFooter>
                        </Card>

                        {/* Bulk recipient list */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Bulk Generate & Email</CardTitle>
                                <CardDescription>Fetch recipients directly from the Firebase Database.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4 pb-4 border-b border-muted">
                                    <div className="flex-1 space-y-2">
                                        <Label>Select Target Audience</Label>
                                        <Select value={targetSegment} onValueChange={setTargetSegment}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Audience segment" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">🏆 All Confirmed Participants</SelectItem>
                                                <SelectItem value="winners">⭐ Hackathon Winners</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-end">
                                        <Button variant="secondary" className="w-full sm:w-auto" onClick={fetchUsersFromDb} disabled={isFetchingUsers}>
                                            <Layers className="mr-2 h-4 w-4" /> {isFetchingUsers ? 'Fetching...' : 'Fetch Users'}
                                        </Button>
                                    </div>
                                </div>

                                {recipients.length > 0 ? (
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                        <div className="text-sm font-medium text-muted-foreground mb-2 flex justify-between items-center">
                                            <span>Ready to send to {recipients.length} users:</span>
                                            <Button variant="ghost" size="sm" onClick={() => setRecipients([])} className="h-6 px-2 text-xs">Clear List</Button>
                                        </div>
                                        {recipients.map((r) => (
                                            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between border rounded-lg p-3 text-sm gap-2">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{r.name}</span>
                                                    <span className="text-xs text-muted-foreground">{r.email}</span>
                                                </div>
                                                <Badge variant="outline" className="w-fit">{r.role}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-muted-foreground">
                                        <FileBadge className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                        <p>Select an audience and click "Fetch Users" to load recipients from the database.</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button className="w-full bg-primary" onClick={handleBulkGenerate} disabled={isGenerating || recipients.length === 0}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isGenerating ? 'Sending...' : `Generate & Email ${recipients.length} Certificate(s)`}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── Email Blaster Tab ──────────────────────────────────── */}
                <TabsContent value="communications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><MailCheck className="h-5 w-5" /> Target Email Blaster</CardTitle>
                            <CardDescription>Send targeted updates via SMTP. Separate multiple emails with a comma.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Database Audience</Label>
                                <Select value={emailSegment} onValueChange={(v) => {
                                    setEmailSegment(v);
                                    fetchEmailsFromDb(v);
                                }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Database Segment" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="custom">Custom (Type below)</SelectItem>
                                        <SelectItem value="participant">🏆 All Confirmed Participants</SelectItem>
                                        <SelectItem value="winner">⭐ Hackathon Winners</SelectItem>
                                        <SelectItem value="sponsor">🤝 Event Sponsors</SelectItem>
                                        <SelectItem value="judge">⚖️ Hackathon Judges</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex justify-between">
                                    <span>To (comma-separated emails)</span>
                                    {isFetchingEmails && <span className="text-xs text-primary animate-pulse font-normal">Fetching...</span>}
                                </Label>
                                <Input
                                    placeholder="alice@example.com, bob@example.com"
                                    value={emailTo}
                                    onChange={e => setEmailTo(e.target.value)}
                                    disabled={isFetchingEmails}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subject Line</Label>
                                <Input
                                    placeholder="URGENT: Submission deadline extended by 2 hours!"
                                    value={emailSubject}
                                    onChange={e => setEmailSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email Body (HTML supported)</Label>
                                <Textarea
                                    placeholder="Hello team,&#10;&#10;We wanted to let you know..."
                                    className="min-h-[180px]"
                                    value={emailBody}
                                    onChange={e => setEmailBody(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Attach Participation Certificate</Label>
                                    <p className="text-sm text-muted-foreground">Auto-generate and attach a certificate PDF to this email.</p>
                                </div>
                                <Switch checked={sendWithCert} onCheckedChange={setSendWithCert} />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 border-t pt-4">
                            <Button variant="outline">Save Draft</Button>
                            <Button onClick={handleEmailBlast} disabled={isSending}>
                                <Send className="mr-2 h-4 w-4" />
                                {isSending ? 'Dispatching...' : 'Send Email Blast'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ── QR Badge Blast Tab ────────────────────────────────── */}
                <TabsContent value="qr-blast" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> QR Badge Blast</CardTitle>
                            <CardDescription>Enter email addresses to send personalized QR attendance badges. When scanned, the corresponding email will receive their certificate.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email Addresses (one per line or comma-separated)</Label>
                                <Textarea
                                    placeholder={"alice@example.com\nbob@example.com\ncharlie@example.com"}
                                    className="min-h-[160px] font-mono text-sm"
                                    value={qrEmails}
                                    onChange={e => setQrEmails(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">{qrEmails.split(/[\n,]/).filter(e => e.trim()).length} email(s) entered</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>QR Expiry (hours)</Label>
                                    <Input type="number" min={1} max={168} value={qrExpiry} onChange={e => setQrExpiry(Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Include Certificate on Scan</Label>
                                    <p className="text-sm text-muted-foreground">When QR is scanned at check-in, automatically email the certificate to that address.</p>
                                </div>
                                <Switch checked={qrIncludeCert} onCheckedChange={setQrIncludeCert} />
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                            <Button className="w-full" onClick={handleQrBlast} disabled={isBlasting}>
                                <Send className="mr-2 h-4 w-4" />
                                {isBlasting ? 'Sending...' : `Blast QR Badges to ${qrEmails.split(/[\n,]/).filter(e => e.trim()).length} Email(s)`}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
