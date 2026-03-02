'use client';

import React, { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Type, CheckSquare, List, GripVertical, Trash2 } from 'lucide-react';

// Field Types
type FieldType = 'text' | 'email' | 'number' | 'checkbox' | 'select';

interface FormField {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[]; // For select/radio fields
}

// Initial dummy state to show it working
const initialFields: FormField[] = [
    { id: 'f-1', type: 'text', label: 'Full Name', placeholder: 'John Doe', required: true },
    { id: 'f-2', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true },
];

export default function FormBuilderPage() {
    const [fields, setFields] = useState<FormField[]>(initialFields);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

    const selectedField = fields.find((f) => f.id === selectedFieldId);

    // Drag end handler to reorder items
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
        const newField: FormField = {
            id: `f-${Date.now()}`,
            type,
            label: `New ${type} field`,
            placeholder: '',
            required: false,
        };
        setFields([...fields, newField]);
        setSelectedFieldId(newField.id);
    };

    // Update selected field property
    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    };

    // Remove field
    const removeField = (id: string) => {
        setFields(fields.filter((f) => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden">
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
                    <Button variant="outline" className="w-full justify-start" onClick={() => addField('email')}>
                        <Type className="mr-2 h-4 w-4" /> Email Input
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => addField('number')}>
                        <Type className="mr-2 h-4 w-4" /> Number Input
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => addField('select')}>
                        <List className="mr-2 h-4 w-4" /> Dropdown Options
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => addField('checkbox')}>
                        <CheckSquare className="mr-2 h-4 w-4" /> Checkbox
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
                                                    <Label className="text-base">
                                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                                    </Label>
                                                    {field.type === 'select' ? (
                                                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                                                            <option>Select an option...</option>
                                                        </select>
                                                    ) : field.type === 'checkbox' ? (
                                                        <div className="flex items-center space-x-2">
                                                            <input type="checkbox" className="h-4 w-4" disabled />
                                                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                                Checkbox label placeholder
                                                            </label>
                                                        </div>
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
                            {(selectedField.type === 'text' || selectedField.type === 'email' || selectedField.type === 'number') && (
                                <div className="space-y-2">
                                    <Label htmlFor="prop-placeholder">Placeholder Text</Label>
                                    <Input
                                        id="prop-placeholder"
                                        value={selectedField.placeholder}
                                        onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                                    />
                                </div>
                            )}
                            <div className="flex items-center space-x-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="prop-required"
                                    checked={selectedField.required}
                                    onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="prop-required" className="font-normal cursor-pointer">
                                    Required field
                                </Label>
                            </div>

                            {selectedField.type === 'select' && (
                                <div className="pt-4 border-t space-y-4">
                                    <Label>Dropdown Options</Label>
                                    <p className="text-xs text-muted-foreground">Options management will go here in the next iteration.</p>
                                    <Button variant="outline" size="sm" className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Option</Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
