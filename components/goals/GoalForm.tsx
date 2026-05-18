'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ThrustArea, UoMType, GoalTemplate } from '@/types'
import { GOAL_RULES } from '@/lib/validations'
import { uomLabel } from '@/lib/scoring'
import { toast } from 'sonner'

const UOM_TYPES: UoMType[] = ['min_numeric', 'max_numeric', 'min_percent', 'max_percent', 'timeline', 'zero']

const schema = z.object({
  thrust_area_id: z.string().min(1, 'Select a thrust area'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  uom_type: z.enum(['min_numeric', 'max_numeric', 'min_percent', 'max_percent', 'timeline', 'zero'] as const),
  target_value: z.string().optional(),
  target_date: z.string().optional(),
  weightage: z.number().min(GOAL_RULES.MIN_WEIGHT, `Minimum weightage is ${GOAL_RULES.MIN_WEIGHT}%`).max(100),
})

type FormData = z.infer<typeof schema>

interface GoalFormProps {
  thrustAreas: ThrustArea[]
  templates: GoalTemplate[]
  remainingWeightage: number
  onSubmit: (data: FormData) => Promise<void>
  onCancel: () => void
}

export function GoalForm({ thrustAreas, templates, remainingWeightage, onSubmit, onCancel }: GoalFormProps) {
  const [uomType, setUomType] = useState<UoMType>('min_numeric')
  const [selectedThrustId, setSelectedThrustId] = useState('')

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { uom_type: 'min_numeric', weightage: Math.min(20, remainingWeightage) },
  })

  function applyTemplate(template: GoalTemplate) {
    setValue('title', template.title)
    setValue('description', template.description ?? '')
    setValue('uom_type', template.uom_type)
    setValue('thrust_area_id', template.thrust_area_id)
    setValue('weightage', Math.min(template.suggested_weightage, remainingWeightage))
    setUomType(template.uom_type)
    setSelectedThrustId(template.thrust_area_id)
    toast.success('Template applied')
  }

  const filteredTemplates = selectedThrustId
    ? templates.filter(t => t.thrust_area_id === selectedThrustId)
    : templates

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Thrust Area + Templates */}
      <div className="space-y-1.5">
        <Label>Thrust Area</Label>
        <Select value={selectedThrustId} onValueChange={(v: string | null) => { if (v) { setValue('thrust_area_id', v); setSelectedThrustId(v) } }}>
          <SelectTrigger>
            <span className="truncate text-sm">
              {thrustAreas.find(t => t.id === selectedThrustId)?.name ?? 'Select thrust area'}
            </span>
          </SelectTrigger>
          <SelectContent>
            {thrustAreas.map(ta => (
              <SelectItem key={ta.id} value={ta.id}>{ta.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.thrust_area_id && <p className="text-xs text-red-500">{errors.thrust_area_id.message}</p>}

        {filteredTemplates.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-xs text-slate-500">Quick import from template:</p>
            <div className="flex flex-wrap gap-1.5">
              {filteredTemplates.slice(0, 4).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Goal Title</Label>
        <Input id="title" placeholder="e.g. Achieve revenue target of 5Cr" {...register('title')} />
        {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" placeholder="Add context or success criteria" rows={2} {...register('description')} />
      </div>

      {/* UoM Type */}
      <div className="space-y-1.5">
        <Label>How is this goal measured?</Label>
        <RadioGroup
          defaultValue="min_numeric"
          onValueChange={(v) => { setUomType(v as UoMType); setValue('uom_type', v as UoMType) }}
          className="grid grid-cols-2 gap-2"
        >
          {UOM_TYPES.map(type => (
            <label
              key={type}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs transition-colors ${
                uomType === type ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <RadioGroupItem value={type} className="mt-0.5" />
              <span>{uomLabel(type)}</span>
            </label>
          ))}
        </RadioGroup>
        <p className="text-xs text-slate-400">Choose the type that matches how your target is expressed.</p>
      </div>

      {/* Target — conditional on UoM type */}
      {(uomType === 'min_numeric' || uomType === 'max_numeric') && (
        <div className="space-y-1.5">
          <Label htmlFor="target_value">Target Value</Label>
          <Input id="target_value" type="number" placeholder="e.g. 50,00,000" {...register('target_value')} />
        </div>
      )}
      {(uomType === 'min_percent' || uomType === 'max_percent') && (
        <div className="space-y-1.5">
          <Label htmlFor="target_value">Target (%)</Label>
          <Input id="target_value" type="number" placeholder="e.g. 90" min={0} max={100} {...register('target_value')} />
        </div>
      )}
      {uomType === 'timeline' && (
        <div className="space-y-1.5">
          <Label htmlFor="target_date">Target Completion Date</Label>
          <Input id="target_date" type="date" {...register('target_date')} />
        </div>
      )}
      {uomType === 'zero' && (
        <p className="rounded bg-slate-50 p-2 text-xs text-slate-600">
          Zero = success. Goal scores 100% if actual is zero (e.g. safety incidents).
        </p>
      )}

      {/* Weightage */}
      <div className="space-y-1.5">
        <Label htmlFor="weightage">Goal weight (%)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="weightage"
            type="number"
            min={GOAL_RULES.MIN_WEIGHT}
            max={100}
            {...register('weightage', { valueAsNumber: true })}
            className="w-28"
          />
          <span className="text-xs text-slate-500">{remainingWeightage}% left to assign across all goals</span>
        </div>
        {errors.weightage && <p className="text-xs text-red-500">{errors.weightage.message}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add goal'}
        </Button>
      </div>
    </form>
  )
}
