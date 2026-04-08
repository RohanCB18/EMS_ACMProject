"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, Send, CheckCircle2, IndianRupee, FileText, Camera } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

export default function VolunteerReimbursementPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        usn: '',
        mobile: '',
        itemDescription: '',
        amount: '',
        txId: ''
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error("Please upload a receipt/transaction screenshot.");
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Convert file to base64 data URL (no Firebase Storage needed)
            const base64Url = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // 2. Save data + receipt image through secure backend API
            await fetchApi("/api/finance/reimbursements", {
                method: "POST",
                body: JSON.stringify({
                    volunteer_name: formData.name,
                    volunteer_usn: formData.usn,
                    volunteer_mobile: formData.mobile,
                    item_description: formData.itemDescription,
                    amount: parseFloat(formData.amount),
                    tx_id: formData.txId,
                    receipt_url: base64Url,
                })
            });

            toast.success("Reimbursement request submitted successfully!");
            setIsSubmitted(true);
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit request. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
                <Card className="max-w-md w-full text-center py-8">
                    <CardContent className="space-y-4">
                        <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Submission Successful!</CardTitle>
                        <CardDescription className="text-lg">
                            Your reimbursement request for ₹{formData.amount} has been sent to the admin for approval.
                        </CardDescription>
                        <div className="pt-6">
                            <Button className="w-full" onClick={() => setIsSubmitted(false)}>Submit Another Entry</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
                <IndianRupee className="h-8 w-8 text-primary" /> Volunteer Reimbursement
            </h1>

            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Expense Details</CardTitle>
                        <CardDescription>
                            Submit your out-of-pocket expenses for hackathon items. Please attach a valid GPay/Transaction screenshot.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input 
                                    id="name" 
                                    required 
                                    placeholder="Enter your name" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="usn">USN / ID Number</Label>
                                <Input 
                                    id="usn" 
                                    required 
                                    placeholder="e.g. 1RV21CS001" 
                                    value={formData.usn}
                                    onChange={e => setFormData({...formData, usn: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile Number (Linked to GPay/UPI)</Label>
                            <Input 
                                id="mobile" 
                                required 
                                type="tel" 
                                placeholder="10-digit mobile number" 
                                value={formData.mobile}
                                onChange={e => setFormData({...formData, mobile: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="itemDescription">What did you buy?</Label>
                            <Textarea 
                                id="itemDescription" 
                                required 
                                placeholder="e.g. 50 Arduino cables, Hardware components for AI track" 
                                value={formData.itemDescription}
                                onChange={e => setFormData({...formData, itemDescription: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (₹)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                                    <Input 
                                        id="amount" 
                                        required 
                                        type="number" 
                                        className="pl-7" 
                                        placeholder="0.00" 
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="txId">Transaction ID (UTR)</Label>
                                <Input 
                                    id="txId" 
                                    required 
                                    placeholder="GPay/UPI Ref No." 
                                    value={formData.txId}
                                    onChange={e => setFormData({...formData, txId: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Proof of Payment (Screenshot)</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={handleFileChange}
                                    required
                                />
                                {previewUrl ? (
                                    <div className="relative w-full aspect-video max-h-48 overflow-hidden rounded-md border">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                                        <Button 
                                            type="button" 
                                            variant="secondary" 
                                            size="sm" 
                                            className="absolute bottom-2 right-2"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setFile(null);
                                                setPreviewUrl(null);
                                            }}
                                        >
                                            Change Image
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground font-medium">Click to upload screenshot</p>
                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>Uploading...</>
                            ) : (
                                <><Send className="mr-2 h-4 w-4" /> Submit for Reimbursement</>
                            )}
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground">
                            By submitting, you certify that this expense was incurred for official hackathon purposes.
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
