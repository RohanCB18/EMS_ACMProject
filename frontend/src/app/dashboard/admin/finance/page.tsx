'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw, Landmark, Receipt, CheckCircle2, Camera } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a05195', '#f95d6a'];

const initialMockTransactions: { id: string; date: string; description: string; category: string; amount: number; status: string; method: string }[] = [];


export default function FinanceDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [isSyncing, setIsSyncing] = useState(false);

    // Load transactions from localStorage on first mount (survives refresh)
    const [transactions, setTransactions] = useState<{ id: string; date: string; description: string; category: string; amount: number; status: string; method: string }[]>(() => {
        try {
            const saved = localStorage.getItem('finance_transactions');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [reimbursements, setReimbursements] = useState<any[]>([]);

    // Real-time synchronization for reimbursements
    useEffect(() => {
        // 1. Listen to the dedicated 'reimbursements' collection (volunteers)
        const qExp = query(collection(db, "reimbursements"), orderBy("created_at", "desc"));
        const unsubExp = onSnapshot(qExp, (snapshot) => {
            const volunteerExp = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().volunteer_name,
                usn: doc.data().volunteer_usn,
                mobile: doc.data().volunteer_mobile,
                amount: doc.data().amount,
                description: doc.data().item_description,
                status: doc.data().status.charAt(0).toUpperCase() + doc.data().status.slice(1), // Capitalize
                receipt_url: doc.data().receipt_url,
                type: 'volunteer'
            }));
            
            // Combine with winners (fetched below)
            setReimbursements(prev => {
                const winners = prev.filter(r => r.type === 'winner');
                return [...volunteerExp, ...winners];
            });
        });

        // 2. Listen to winners from 'users' collection
        const qWin = query(collection(db, "users"), where("role", "==", "winner"));
        const unsubWin = onSnapshot(qWin, (snapshot) => {
            const winners = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().display_name,
                usn: doc.data().usn || 'N/A',
                mobile: doc.data().mobile || 'N/A',
                amount: 25000, // Standard prize for now, mapping could be more complex
                description: `${doc.data().track || 'General'} Track 1st Prize`,
                status: 'Pending', // Default for winners unless we add a payout field
                type: 'winner'
            }));

            setReimbursements(prev => {
                const volunteers = prev.filter(r => r.type === 'volunteer');
                return [...volunteers, ...winners];
            });
        });

        return () => {
            unsubExp();
            unsubWin();
        };
    }, []);

    const updateReimbursementStatus = async (id: string, newStatus: string, type: string) => {
        try {
            if (type === 'volunteer') {
                const docRef = doc(db, "reimbursements", id);
                await updateDoc(docRef, { status: newStatus.toLowerCase() });
                toast.success(`Updated status to ${newStatus}`);
            } else {
                toast.info("Winner prize status tracking to be integrated with Payouts API.");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status.");
        }
    };

    // Persist transactions to localStorage whenever they update
    useEffect(() => {
        localStorage.setItem('finance_transactions', JSON.stringify(transactions));
    }, [transactions]);
    const expenseData = useMemo(() => {
        const totals: Record<string, number> = {};
        transactions.forEach(tx => {
            const cat = tx.category || 'Other';
            totals[cat] = (totals[cat] || 0) + tx.amount;
        });
        return Object.entries(totals).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
    }, [transactions]);

    const monthlySpend = useMemo(() => {
        const monthMap: Record<string, number> = {};
        transactions.forEach(tx => {
            const dateStr = tx.date || '';
            // Parse dates in formats like "2026-03-01" or "03/01/2026"
            let month = '';
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                month = new Date(dateStr).toLocaleString('default', { month: 'short' });
            } else if (dateStr.includes('/')) {
                const [m, , y] = dateStr.split('/');
                month = new Date(`${y}-${m}-01`).toLocaleString('default', { month: 'short' });
            } else {
                month = 'Other';
            }
            monthMap[month] = (monthMap[month] || 0) + tx.amount;
        });
        return Object.entries(monthMap).map(([name, spend]) => ({ name, spend: Math.round(spend * 100) / 100 }));
    }, [transactions]);

    // Summary totals derived from live transactions
    const totalSpent = useMemo(() => transactions.reduce((sum, tx) => sum + tx.amount, 0), [transactions]);
    const pendingCount = useMemo(() => transactions.filter(tx => tx.status === 'Pending').length, [transactions]);
    const pendingTotal = useMemo(() => transactions.filter(tx => tx.status === 'Pending').reduce((s, t) => s + t.amount, 0), [transactions]);

    const handleBankSync = async (fileToUpload?: File) => {
        setIsSyncing(true);
        try {
            const formData = new FormData();

            if (fileToUpload) {
                // User provided a real file via the drag-and-drop dialog
                formData.append('file', fileToUpload);
            } else {
                // Fallback to mock file if they just press the header button directly
                const csvContent = "Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance\n15/03/2026,15/03/2026,NEFT-AWS EC2 INSTANCE CHARGE,REF123,12500.00,,50000.00\n16/03/2026,16/03/2026,UPI-DOMINOS PIZZA,REF124,4500.50,,45499.50";
                const blob = new Blob([csvContent], { type: 'text/csv' });
                formData.append('file', blob, 'mock_statement.csv');
            }

            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${API_BASE}/api/finance/upload`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Failed to sync bank statement");
            const data = await response.json();

            // Transform backend data to match frontend table structure
            if (data.data && Array.isArray(data.data)) {
                const newParsedTx = data.data.map((tx: any, index: number) => ({
                    id: `SYNC-${Math.floor(Math.random() * 10000) + index}`,
                    date: tx.date || 'Unknown',
                    description: tx.description || 'Bank Transaction',
                    category: tx.category || 'Other',
                    amount: Math.abs(tx.amount || 0),
                    status: 'Paid',
                    method: 'Bank Sync'
                }));
                // Add new transactions to the top of the list and switch to the ledger tab
                setTransactions([...newParsedTx, ...transactions]);
                setActiveTab('transactions');
            }

            toast.success(data.message || "Bank statement synced successfully!");
        } catch (error) {
            toast.error("Error connecting to backend API");
            console.error(error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Finance & Automation</h2>
                    <p className="text-muted-foreground">Manage budgets, track expenses, and automate reimbursements.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { localStorage.removeItem('finance_transactions'); setTransactions([]); }}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Clear Data
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹1,00,000.00</div>
                        <p className="text-xs text-muted-foreground">From 4 Sponsors</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">{((totalSpent / 1000000) * 100).toFixed(1)}% of total budget</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                        <Receipt className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground">Totalling ₹{pendingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                        <Landmark className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{(1000000 - totalSpent).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Safe to spend</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview & Charts</TabsTrigger>
                    <TabsTrigger value="transactions">Ledger & Transactions</TabsTrigger>
                    <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Spend Trajectory</CardTitle>
                                <CardDescription>Monthly expense burn rate leading up to the event.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                    <BarChart data={monthlySpend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.2} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                                        <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                                        <Bar dataKey="spend" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Expense Distribution</CardTitle>
                                <CardDescription>Budget allocation across categories.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px] flex flex-col justify-center items-center">
                                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                    <PieChart>
                                        <Pie
                                            data={expenseData}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {expenseData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value) => `₹${value}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    {expenseData.map((entry, index) => (
                                        <div key={entry.name} className="flex items-center text-xs text-muted-foreground mr-2">
                                            <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            {entry.name}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Transaction Ledger</CardTitle>
                                <CardDescription>Comprehensive list of all synced bank and gateway transactions.</CardDescription>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Upload CSV</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Ingest Bank Statement</DialogTitle>
                                        <DialogDescription>
                                            Upload your bank's CSV export. The ML engine will auto-categorize expenses.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center">
                                        <Upload className="h-8 w-8 text-muted-foreground mb-4" />
                                        <p className="text-sm font-medium">Drag & drop your CSV file here</p>
                                        <p className="text-xs text-muted-foreground mt-1">or click to browse from your computer</p>
                                        <Input
                                            type="file"
                                            className="hidden"
                                            id="csv-upload"
                                            accept=".csv"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleBankSync(file);
                                            }}
                                        />
                                        <Button
                                            variant="secondary"
                                            className="mt-4"
                                            onClick={() => document.getElementById('csv-upload')?.click()}
                                            disabled={isSyncing}
                                        >
                                            {isSyncing ? "Uploading..." : "Select File"}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Transaction ID</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Upload className="h-6 w-6 opacity-40" />
                                                    <p className="text-sm">No transactions yet. Upload a CSV to get started.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="font-medium text-xs">{tx.id}</TableCell>
                                            <TableCell>{tx.date}</TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-muted">{tx.category}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{tx.method}</TableCell>
                                            <TableCell>
                                                {tx.status === 'Paid' && <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>}
                                                {tx.status === 'Pending' && <Badge variant="secondary" className="text-amber-500 border-amber-200 bg-amber-50">Pending Approval</Badge>}
                                                {tx.status === 'Processing' && <Badge variant="outline" className="text-blue-500 border-blue-200">Processing</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                ₹{tx.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reimbursements" className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-medium tracking-tight">Manual Reimbursement Tracker (GPay)</h3>
                            <p className="text-sm text-muted-foreground">Process payments manually via GPay and track their status.</p>
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        {reimbursements.map((reimb) => (
                            <Card key={reimb.id} className={`border-l-4 shadow-sm relative overflow-hidden ${reimb.status === 'Pending' ? 'border-amber-400' :
                                reimb.status === 'Processing' ? 'border-blue-400' : 'border-green-400'
                                }`}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-base">{reimb.description}</CardTitle>
                                                <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-4">
                                                    {reimb.type === 'winner' ? '🏆 Prize' : '🙋 Volunteer'}
                                                </Badge>
                                            </div>
                                            <CardDescription className="mt-1 font-medium text-foreground">{reimb.name} • {reimb.usn}</CardDescription>
                                            <CardDescription className="flex items-center gap-1 mt-1 text-sm bg-muted/60 p-1 px-2 rounded-md font-mono">
                                                📱 GPay: {reimb.mobile}
                                            </CardDescription>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className="text-lg font-bold">₹{reimb.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            <div className="mt-2">
                                                {reimb.status === 'Pending' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 uppercase tracking-widest text-[10px]">Pending</Badge>}
                                                {reimb.status === 'Processing' && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 uppercase tracking-widest text-[10px]">Processing</Badge>}
                                                {reimb.status === 'Done' && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 uppercase tracking-widest text-[10px]">Done ✓</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col gap-2 mt-2">
                                        {reimb.receipt_url && (
                                            <Button variant="link" className="h-4 p-0 text-xs justify-start text-blue-600" onClick={() => window.open(reimb.receipt_url, '_blank')}>
                                                <Camera className="mr-1 h-3 w-3" /> View Receipt Screenshot
                                            </Button>
                                        )}
                                        <div className="flex gap-2">
                                            {reimb.status === 'Pending' && (
                                                <Button
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => updateReimbursementStatus(reimb.id, 'Processing', reimb.type)}
                                                >Mark as Processing</Button>
                                            )}
                                            {reimb.status === 'Processing' && (
                                                <Button
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => updateReimbursementStatus(reimb.id, 'Done', reimb.type)}
                                                >Mark as Paid (Done)</Button>
                                            )}
                                            {reimb.status === 'Done' && (
                                                <Button
                                                    variant="outline"
                                                    className="w-full text-muted-foreground bg-muted/30"
                                                    disabled
                                                ><CheckCircle2 className="mr-2 h-4 w-4" /> Payment Completed</Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
}
