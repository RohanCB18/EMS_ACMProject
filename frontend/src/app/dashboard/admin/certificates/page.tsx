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
import { FileBadge, Send, CopyCheck, FileKey2, FileDown, Layers, History, MailCheck, ShieldAlert, Plus, Trash2, X } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from "sonner"

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

    // Email blast state
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [emailTo, setEmailTo] = useState("");

    // Certificate recipient list
    const [recipients, setRecipients] = useState<Recipient[]>([
        { id: '1', name: '', email: '', role: 'Participant', track: 'General', project_name: '' }
    ]);

    // Single / preview cert form
    const [previewName, setPreviewName] = useState('');
    const [previewRole, setPreviewRole] = useState('Participant');
    const [previewTrack, setPreviewTrack] = useState('General');
    const [previewProject, setPreviewProject] = useState('');

    // ── Recipient helpers ────────────────────────────────────────────────────

    const addRecipient = () => {
        setRecipients(prev => [
            ...prev,
            { id: Date.now().toString(), name: '', email: '', role: 'Participant', track: 'General', project_name: '' }
        ]);
    };

    const removeRecipient = (id: string) => {
        setRecipients(prev => prev.filter(r => r.id !== id));
    };

    const updateRecipient = (id: string, field: keyof Recipient, value: string) => {
        setRecipients(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    // ── Preview / Single PDF download ────────────────────────────────────────

    const handlePreview = async () => {
        if (!previewName.trim()) {
            toast.error("Please enter a name to preview the certificate");
            return;
        }
        setIsGenerating(true);
        try {
            const response = await fetch("http://localhost:8001/api/automation/certificates/generate", {
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
        const validRecipients = recipients.filter(r => r.name.trim() && r.email.trim());
        if (validRecipients.length === 0) {
            toast.error("Add at least one recipient with name and email");
            return;
        }

        setIsGenerating(true);
        let successCount = 0;
        let failCount = 0;

        for (const recipient of validRecipients) {
            try {
                const response = await fetch("http://localhost:8001/api/automation/email/blast", {
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
            const response = await fetch("http://localhost:8001/api/automation/email/blast", {
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

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Post-Event Automation</h2>
                    <p className="text-muted-foreground">Automate certificate generation, bulk emails, and feedback forms.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><History className="mr-2 h-4 w-4" /> View Logs</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,240</div>
                        <p className="text-xs text-muted-foreground">+180 this week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Certificates Generated</CardTitle>
                        <FileBadge className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">542</div>
                        <p className="text-xs text-muted-foreground">Across 3 Tracks</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Feedback Collected</CardTitle>
                        <CopyCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">384</div>
                        <p className="text-xs text-muted-foreground">70.8% response rate</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="certificates" onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-3">
                    <TabsTrigger value="certificates">Certificate Engine</TabsTrigger>
                    <TabsTrigger value="communications">Email Blaster</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback Loops</TabsTrigger>
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
                                <CardDescription>Add recipients below. Each gets a personalized PDF certificate via email.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {recipients.map((r, idx) => (
                                    <div key={r.id} className="border rounded-lg p-3 space-y-2 relative">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground font-medium">Recipient {idx + 1}</span>
                                            {recipients.length > 1 && (
                                                <button onClick={() => removeRecipient(r.id)} className="text-destructive hover:text-red-500">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input placeholder="Full Name" value={r.name} onChange={e => updateRecipient(r.id, 'name', e.target.value)} />
                                            <Input placeholder="Email" type="email" value={r.email} onChange={e => updateRecipient(r.id, 'email', e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Select value={r.role} onValueChange={v => updateRecipient(r.id, 'role', v)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Participant">Participant</SelectItem>
                                                    <SelectItem value="Winner">Winner</SelectItem>
                                                    <SelectItem value="Runner Up">Runner Up</SelectItem>
                                                    <SelectItem value="Mentor">Mentor</SelectItem>
                                                    <SelectItem value="Judge">Judge</SelectItem>
                                                    <SelectItem value="Volunteer">Volunteer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Select value={r.track} onValueChange={v => updateRecipient(r.id, 'track', v)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                                        <Input placeholder="Project Name (optional)" className="text-xs h-8" value={r.project_name} onChange={e => updateRecipient(r.id, 'project_name', e.target.value)} />
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full" onClick={addRecipient}>
                                    <Plus className="mr-2 h-3.5 w-3.5" /> Add Recipient
                                </Button>
                            </CardContent>
                            <CardFooter className="border-t pt-4">
                                <Button className="w-full bg-primary" onClick={handleBulkGenerate} disabled={isGenerating}>
                                    <Send className="mr-2 h-4 w-4" />
                                    {isGenerating ? 'Sending...' : `Generate & Email ${recipients.filter(r => r.name && r.email).length} Certificate(s)`}
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
                                <Label>To (comma-separated emails)</Label>
                                <Input
                                    placeholder="alice@example.com, bob@example.com"
                                    value={emailTo}
                                    onChange={e => setEmailTo(e.target.value)}
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

                {/* ── Feedback Loops Tab ────────────────────────────────── */}
                <TabsContent value="feedback" className="space-y-4">
                    <Card className="border-amber-200/50 bg-amber-500/5">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <ShieldAlert className="h-10 w-10 text-amber-500 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Event In Progress</h3>
                            <p className="text-muted-foreground max-w-md mb-6">
                                Automated feedback forms will unlock after the judging phase concludes. This prevents participants from getting distracted.
                            </p>
                            <Button disabled variant="outline">Configure Forms (Locked)</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
