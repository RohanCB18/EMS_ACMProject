'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, FileText, Upload } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { RouteGuard } from '@/components/RouteGuard';
import { fetchApi, ApiError } from '@/lib/api';

interface ConditionalRule {
    depends_on_field_id: string;
    depends_on_value: string;
}

interface FormField {
    id: string;
    type: string;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
    conditional?: ConditionalRule | null;
}

export default function RegisterEventPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [fields, setFields] = useState<FormField[]>([]);
    const [formTitle, setFormTitle] = useState('Registration Form');
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const eventId = 'default-event'; // TODO: Make dynamic from URL

    useEffect(() => {
        loadForm();
        checkExistingRegistration();
    }, [user]);

    const loadForm = async () => {
        try {
            const data = await fetchApi(`/api/registration/schema/${eventId}`);
            setFields(data.fields || []);
            setFormTitle(data.form_title || 'Registration Form');
        } catch (err) {
            console.error('Failed to load form:', err);
            setError('Registration form not found or inaccessible.');
        } finally {
            setLoading(false);
        }
    };

    const checkExistingRegistration = async () => {
        if (!user) return;
        try {
            await fetchApi(`/api/registration/status/${user.uid}`);
            setSubmitted(true);
        } catch {
            // No existing registration — that's fine
        }
    };

    const isFieldVisible = (field: FormField): boolean => {
        if (!field.conditional) return true;
        const dependsValue = responses[field.conditional.depends_on_field_id] || '';
        return dependsValue === field.conditional.depends_on_value;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            router.push('/auth/login');
            return;
        }

        setError(null);
        setSubmitting(true);

        // Validate required visible fields
        for (const field of fields) {
            if (field.required && isFieldVisible(field)) {
                if (!responses[field.id]) {
                    setError(`Please fill in: ${field.label}`);
                    setSubmitting(false);
                    return;
                }
            }
        }

        try {
            await fetchApi('/api/registration/submit', {
                method: 'POST',
                body: JSON.stringify({
                    uid: user.uid,
                    event_id: eventId,
                    responses,
                }),
            });
            setSubmitted(true);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.data?.detail || err.message);
            } else {
                setError('Failed to connect to server');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full text-center">
                    <CardContent className="pt-6 pb-8 space-y-4">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                        <h2 className="text-2xl font-bold">Registration Submitted!</h2>
                        <p className="text-muted-foreground">
                            Your registration is being reviewed. You&apos;ll see your status on your dashboard.
                        </p>
                        <Badge variant="secondary" className="text-sm">Status: Pending Review</Badge>
                        <div className="pt-4">
                            <Button onClick={() => router.push('/dashboard/participant/overview')}>
                                Go to Dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <RouteGuard allowedRoles={['participant']}>
            <div className="min-h-screen bg-muted/30 py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{formTitle}</CardTitle>
                            <CardDescription>
                                Fill in the form below to register for the event. Fields marked with * are required.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md mb-6">
                                    {error}
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {fields.map((field) => {
                                    if (!isFieldVisible(field)) return null;

                                    return (
                                        <div key={field.id} className="space-y-2">
                                            <Label htmlFor={field.id}>
                                                {field.label}
                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                            </Label>

                                            {field.type === 'text' || field.type === 'email' || field.type === 'number' ? (
                                                <Input
                                                    id={field.id}
                                                    type={field.type}
                                                    placeholder={field.placeholder || ''}
                                                    value={responses[field.id] || ''}
                                                    onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                                                    required={field.required}
                                                />
                                            ) : field.type === 'textarea' ? (
                                                <textarea
                                                    id={field.id}
                                                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    placeholder={field.placeholder || ''}
                                                    value={responses[field.id] || ''}
                                                    onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                                                    required={field.required}
                                                />
                                            ) : field.type === 'select' ? (
                                                <select
                                                    id={field.id}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    value={responses[field.id] || ''}
                                                    onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                                                    required={field.required}
                                                >
                                                    <option value="">Select an option...</option>
                                                    {field.options?.map((opt, i) => (
                                                        <option key={i} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : field.type === 'checkbox' ? (
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        id={field.id}
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded"
                                                        checked={responses[field.id] === 'true'}
                                                        onChange={(e) => setResponses({ ...responses, [field.id]: e.target.checked ? 'true' : 'false' })}
                                                    />
                                                    <label htmlFor={field.id} className="text-sm">
                                                        {field.placeholder || field.label}
                                                    </label>
                                                </div>
                                            ) : field.type === 'file' ? (
                                                <div className="flex items-center gap-3 p-4 border-2 border-dashed rounded-md hover:border-primary/50 transition-colors cursor-pointer">
                                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium">Click to upload</p>
                                                        <p className="text-xs text-muted-foreground">PDF, DOC, or image files</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Input
                                                    id={field.id}
                                                    placeholder={field.placeholder || ''}
                                                    value={responses[field.id] || ''}
                                                    onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    );
                                })}

                                <Button type="submit" className="w-full" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Registration'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </RouteGuard>
    );
}
