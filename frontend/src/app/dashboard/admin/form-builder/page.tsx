'use client';

import React, { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Settings, Plus, Type, CheckSquare, List, GripVertical, Trash2,
    Save, Loader2, Upload, FileText, AlignLeft, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

// Field Types
type FieldType = 'text' | 'email' | 'number' | 'checkbox' | 'select' | 'file' | 'textarea';

interface ConditionalRule {
    depends_on_field_id: string;
    depends_on_value: string;
}

interface FormField {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
    conditional?: ConditionalRule | null;
}

// Initial dummy state
const initialFields: FormField[] = [
    { id: 'f-1', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true },
    { id: 'f-2', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true },
];

export default function FormBuilderPage() {
    const { user } = useAuth();
    const [fields, setFields] = useState<FormField[]>(initialFields);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [eventId, setEventId] = useState('default-event');
    const [formTitle, setFormTitle] = useState('Registration Form');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const selectedField = fields.find((f) => f.id === selectedFieldId);

    // Load existing schema on mount
    useEffect(() => {
        loadSchema();
    }, []);

    const loadSchema = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/registration/schema/${eventId}`);
            if (res.ok) {
                const data = await res.json();
                setFields(data.fields || []);
                setFormTitle(data.form_title || 'Registration Form');
                setSaveMessage('Schema loaded from server');
            }
        } catch {
            // No existing schema — keep defaults
        } finally {
            setLoading(false);
            setTimeout(() => setSaveMessage(null), 3000);
        }
    };

    const saveSchema = async () => {
        setSaving(true);
        setSaveMessage(null);
        try {
            const res = await fetch(`${API_URL}/api/registration/schema`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: eventId,
                    form_title: formTitle,
                    fields: fields.map(f => ({
                        ...f,
                        conditional: f.conditional || null,
                    })),
                }),
            });

            if (res.ok) {
                setSaveMessage('✅ Form saved successfully!');
            } else {
                const err = await res.json();
                setSaveMessage(`❌ Error: ${err.detail}`);
            }
        } catch (err) {
            setSaveMessage('❌ Failed to connect to backend');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveMessage(null), 4000);
        }
    };

    // Drag end handler
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Add new field
    const addField = (type: FieldType) => {
        const labelMap: Record<FieldType, string> = {
            text: 'Short Text',
            email: 'Email Input',
            number: 'Number Input',
            select: 'Dropdown',
            checkbox: 'Checkbox',
            file: 'File Upload',
            textarea: 'Long Text',
        };
        const newField: FormField = {
            id: `f-${Date.now()}`,
            type,
            label: `New ${labelMap[type]}`,
            placeholder: '',
            required: false,
            options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
        };
        setFields([...fields, newField]);
        setSelectedFieldId(newField.id);
    };

    // Update field
    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    };

    // Remove field
    const removeField = (id: string) => {
        setFields(fields.filter((f) => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    // Add option to select field
    const addOption = (fieldId: string) => {
        const field = fields.find(f => f.id === fieldId);
        if (field) {
            const options = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
            updateField(fieldId, { options });
        }
    };

    // Remove option from select field
    const removeOption = (fieldId: string, index: number) => {
        const field = fields.find(f => f.id === fieldId);
        if (field) {
            const options = (field.options || []).filter((_, i) => i !== index);
            updateField(fieldId, { options });
        }
    };

    // Update option text
    const updateOption = (fieldId: string, index: number, value: string) => {
        const field = fields.find(f => f.id === fieldId);
        if (field) {
            const options = [...(field.options || [])];
            options[index] = value;
            updateField(fieldId, { options });
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Input
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="text-lg font-semibold w-64"
                        placeholder="Form title..."
                    />
                    <Input
                        value={eventId}
                        onChange={(e) => setEventId(e.target.value)}
                        className="w-48 text-sm"
                        placeholder="Event ID"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {saveMessage && (
                        <span className="text-sm text-muted-foreground animate-in fade-in">{saveMessage}</span>
                    )}
                    <Button variant="outline" size="sm" onClick={loadSchema} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Load
                    </Button>
                    <Button size="sm" onClick={saveSchema} disabled={saving || fields.length === 0}>
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Form
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 gap-4 overflow-hidden">
                {/* LEFT SIDEBAR: Tools Palette */}
                <Card className="w-64 flex-shrink-0 h-full overflow-y-auto">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Form Elements</CardTitle>
                        <CardDescription>Click to add to your form.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start" onClick={() => addField('text')}>
                            <Type className="mr-2 h-4 w-4" /> Short Text
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => addField('textarea')}>
                            <AlignLeft className="mr-2 h-4 w-4" /> Long Text
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => addField('email')}>
                            <Type className="mr-2 h-4 w-4" /> Email Input
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => addField('number')}>
                            <Type className="mr-2 h-4 w-4" /> Number Input
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => addField('select')}>
                            <List className="mr-2 h-4 w-4" /> Dropdown
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => addField('checkbox')}>
                            <CheckSquare className="mr-2 h-4 w-4" /> Checkbox
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => addField('file')}>
                            <Upload className="mr-2 h-4 w-4" /> File Upload
                        </Button>
                    </CardContent>
                </Card>

                {/* CENTER: Canvas */}
                <Card className="flex-1 h-full flex flex-col overflow-hidden bg-muted/30">
                    <CardHeader className="bg-background border-b">
                        <CardTitle>Registration Form Canvas</CardTitle>
                        <CardDescription>Drag fields to reorder. Click a field to edit its properties.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto space-y-4 bg-background p-8 rounded-xl border shadow-sm min-h-[500px]">
                            {fields.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
                                    <Plus className="h-8 w-8 mb-2 opacity-50" />
                                    <p>No fields added yet.</p>
                                    <p className="text-sm">Click elements from the sidebar to build your form.</p>
                                </div>
                            ) : (
                                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                                        {fields.map((field) => (
                                            <div
                                                key={field.id}
                                                onClick={() => setSelectedFieldId(field.id)}
                                                className={`relative group p-4 border rounded-lg cursor-pointer transition-colors ${selectedFieldId === field.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'
                                                    }`}
                                            >
                                                <div className="flex gap-4">
                                                    <div className="mt-2 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <GripVertical className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <Label className="text-base flex items-center gap-2">
                                                            {field.label}
                                                            {field.required && <span className="text-red-500">*</span>}
                                                            {field.conditional && (
                                                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">conditional</span>
                                                            )}
                                                        </Label>
                                                        {field.type === 'select' ? (
                                                            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled>
                                                                <option>Select an option...</option>
                                                                {field.options?.map((opt, i) => (
                                                                    <option key={i}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        ) : field.type === 'checkbox' ? (
                                                            <div className="flex items-center space-x-2">
                                                                <input type="checkbox" className="h-4 w-4" disabled />
                                                                <label className="text-sm">Checkbox label</label>
                                                            </div>
                                                        ) : field.type === 'file' ? (
                                                            <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-md text-muted-foreground">
                                                                <FileText className="h-4 w-4" />
                                                                <span className="text-sm">Click to upload file</span>
                                                            </div>
                                                        ) : field.type === 'textarea' ? (
                                                            <textarea
                                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm"
                                                                placeholder={field.placeholder || 'Type here...'}
                                                                disabled
                                                            />
                                                        ) : (
                                                            <Input placeholder={field.placeholder || 'Type here...'} disabled className="bg-muted/50" />
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeField(field.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            )}
                            {fields.length > 0 && (
                                <div className="pt-6">
                                    <Button className="w-full" disabled>Register (Preview)</Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* RIGHT SIDEBAR: Properties Panel */}
                <Card className="w-80 flex-shrink-0 h-full overflow-y-auto">
                    <CardHeader className="border-b bg-muted/10 pb-4">
                        <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Field Properties</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-6">
                        {!selectedField ? (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-40">
                                <p>Select a field on the canvas to edit its properties here.</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Field Type</Label>
                                    <div className="text-sm font-medium p-2 bg-muted rounded-md uppercase tracking-wider text-muted-foreground">
                                        {selectedField.type}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="prop-label">Question Label</Label>
                                    <Input
                                        id="prop-label"
                                        value={selectedField.label}
                                        onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                                    />
                                </div>
                                {(['text', 'email', 'number', 'textarea'] as FieldType[]).includes(selectedField.type) && (
                                    <div className="space-y-2">
                                        <Label htmlFor="prop-placeholder">Placeholder Text</Label>
                                        <Input
                                            id="prop-placeholder"
                                            value={selectedField.placeholder}
                                            onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-2">
                                    <Label htmlFor="prop-required" className="font-normal cursor-pointer">
                                        Required field
                                    </Label>
                                    <Switch
                                        id="prop-required"
                                        checked={selectedField.required}
                                        onCheckedChange={(checked) => updateField(selectedField.id, { required: checked })}
                                    />
                                </div>

                                {/* Dropdown Options */}
                                {selectedField.type === 'select' && (
                                    <div className="pt-4 border-t space-y-3">
                                        <Label>Dropdown Options</Label>
                                        {(selectedField.options || []).map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <Input
                                                    value={opt}
                                                    onChange={(e) => updateOption(selectedField.id, i, e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive h-8 w-8"
                                                    onClick={() => removeOption(selectedField.id, i)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => addOption(selectedField.id)}
                                        >
                                            <Plus className="h-4 w-4 mr-2" /> Add Option
                                        </Button>
                                    </div>
                                )}

                                {/* Conditional Logic */}
                                <div className="pt-4 border-t space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-normal">Conditional Display</Label>
                                        <Switch
                                            checked={!!selectedField.conditional}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    updateField(selectedField.id, {
                                                        conditional: {
                                                            depends_on_field_id: '',
                                                            depends_on_value: '',
                                                        },
                                                    });
                                                } else {
                                                    updateField(selectedField.id, { conditional: null });
                                                }
                                            }}
                                        />
                                    </div>
                                    {selectedField.conditional && (
                                        <div className="space-y-2 pl-2 border-l-2 border-yellow-300">
                                            <p className="text-xs text-muted-foreground">Show this field only when:</p>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Depends on Field</Label>
                                                <select
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                    value={selectedField.conditional.depends_on_field_id}
                                                    onChange={(e) =>
                                                        updateField(selectedField.id, {
                                                            conditional: {
                                                                ...selectedField.conditional!,
                                                                depends_on_field_id: e.target.value,
                                                            },
                                                        })
                                                    }
                                                >
                                                    <option value="">Select a field...</option>
                                                    {fields
                                                        .filter((f) => f.id !== selectedField.id)
                                                        .map((f) => (
                                                            <option key={f.id} value={f.id}>
                                                                {f.label}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Equals Value</Label>
                                                <Input
                                                    value={selectedField.conditional.depends_on_value}
                                                    onChange={(e) =>
                                                        updateField(selectedField.id, {
                                                            conditional: {
                                                                ...selectedField.conditional!,
                                                                depends_on_value: e.target.value,
                                                            },
                                                        })
                                                    }
                                                    placeholder="e.g. Student"
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
