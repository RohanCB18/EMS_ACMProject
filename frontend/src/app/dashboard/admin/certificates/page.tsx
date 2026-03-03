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
import { FileBadge, Send, CopyCheck, FileKey2, FileDown, Layers, History, MailCheck, ShieldAlert } from 'lucide-react';
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

export default function AutomationDashboard() {
    const [activeTab, setActiveTab] = useState('certificates');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch("http://localhost:8001/api/automation/certificate/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    participant_name: "John Doe",
                    track: "General",
                    award: "Participant",
                    include_qr: true
                })
            });

            if (!response.ok) throw new Error("Failed to trigger generation");

            toast.success("Certificate engine triggered successfully!");
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // Close modal
        } catch (error) {
            toast.error("Error connecting to backend API");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEmailSend = async () => {
        if (!emailSubject || !emailBody) {
            toast.error("Please fill out the subject and body");
            return;
        }

        setIsSending(true);
        try {
            const response = await fetch("http://localhost:8001/api/automation/email/blast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipients: ["test1@example.com", "test2@example.com"],
                    subject: emailSubject,
                    body_markdown: emailBody
                })
            });

            if (!response.ok) throw new Error("Failed to send email blast");
            toast.success("Emails have been queued for sending!");
        } catch (error) {
            toast.error("Error connecting to backend API");
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

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

                <TabsContent value="certificates" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Bulk Generation settings</CardTitle>
                                <CardDescription>Configure the dynamic data to overlay onto your HTML/PDF templates.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Target Audience</Label>
                                    <Select defaultValue="all-participants">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select target role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all-participants">All Verified Participants (492)</SelectItem>
                                            <SelectItem value="winners">Winners & Runners-up (16)</SelectItem>
                                            <SelectItem value="mentors">Mentors & Judges (34)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Template Selection</Label>
                                    <Select defaultValue="modern">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="modern">Modern Dark (Default)</SelectItem>
                                            <SelectItem value="minimal">Minimal Light</SelectItem>
                                            <SelectItem value="sponsor">Sponsor Branded</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Include QR Verification</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Embeds a unique cryptographic link to verify authenticity.
                                        </p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between border-t p-4">
                                <Button variant="outline" className="w-1/2 mr-2"><FileDown className="mr-2 h-4 w-4" /> Preview 1 PDF</Button>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button className="w-1/2 ml-2 bg-primary">Bulk Generate & Email</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Confirm Bulk Action</DialogTitle>
                                            <DialogDescription>
                                                This will trigger your Python backend to run HTML-to-PDF generation for 492 participants via the background job worker. It will automatically email them via SendGrid upon completion.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}>Cancel</Button>
                                            <Button onClick={handleGenerate} disabled={isGenerating}>
                                                {isGenerating ? 'Generating...' : 'Confirm & Send'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        </Card>

                        <Card className="bg-muted/50 border-dashed">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><FileKey2 className="h-5 w-5" /> Recent Generations</CardTitle>
                                <CardDescription>Status of recent background jobs</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between space-x-4 border-b pb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                                        <div>
                                            <p className="text-sm font-medium leading-none">Mentors Batch (34)</p>
                                            <p className="text-sm text-muted-foreground">Completed 2 hours ago</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">Success</Badge>
                                </div>

                                <div className="flex items-center justify-between space-x-4 border-b pb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                                        <div>
                                            <p className="text-sm font-medium leading-none">Winners Batch (16)</p>
                                            <p className="text-sm text-muted-foreground">Processing 12 / 16</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">In Progress</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="communications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><MailCheck className="h-5 w-5" /> Target Email Blaster</CardTitle>
                            <CardDescription>Send targeted updates via your SMTP integration.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Send To (Filtering)</Label>
                                <Select defaultValue="ai-track">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select recipients" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Registered Users</SelectItem>
                                        <SelectItem value="ai-track">Only 'AI/ML Track' Participants</SelectItem>
                                        <SelectItem value="unsubmitted">Teams marked 'Unsubmitted'</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 mt-4">
                                <Label>Subject Line</Label>
                                <Input
                                    placeholder="URGENT: Submission deadline extended by 2 hours!"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2 mt-4">
                                <Label>Email Body (Markdown supported)</Label>
                                <Textarea
                                    placeholder="Hello {{first_name}},\n\nWe have decided to extend the deadline..."
                                    className="min-h-[200px]"
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Use {'{{parameter}}'} syntax to inject dynamic names/variables from the database.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 border-t p-4">
                            <Button variant="outline">Save Draft</Button>
                            <Button onClick={handleEmailSend} disabled={isSending}>
                                {isSending ? 'Dispatching...' : 'Blast Email to 134 Users'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

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
