import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  parseRateLimitKind,
  parseRateLimitScope,
} from '@/lib/parsers'
import type { RateLimitPolicy } from '../../../shared/admin-types'

export type { RateLimitPolicy }

const DEFAULT_POLICY: RateLimitPolicy = {
  enabled: false,
  scope: 'user',
  kind: 'token bucket',
  rate: 20,
  period: 60_000,
  capacity: 5,
  shards: 1,
}

export function createDefaultRateLimitPolicy(overrides?: Partial<RateLimitPolicy>) {
  return {
    ...DEFAULT_POLICY,
    ...overrides,
  }
}

export function RateLimitEditor({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value?: RateLimitPolicy
  onChange: (value: RateLimitPolicy | undefined) => void
}) {
  const policy = value ?? createDefaultRateLimitPolicy()

  return (
    <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Label>{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {policy.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch
            checked={policy.enabled}
            onCheckedChange={(checked) =>
              onChange({
                ...policy,
                enabled: checked,
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Scope</Label>
          <Select
            value={policy.scope}
            onValueChange={(next) =>
              onChange({
                ...policy,
                scope: parseRateLimitScope(next),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">Per user</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Strategy</Label>
          <Select
            value={policy.kind}
            onValueChange={(next) =>
              onChange({
                ...policy,
                kind: parseRateLimitKind(next),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="token bucket">Token bucket</SelectItem>
              <SelectItem value="fixed window">Fixed window</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Rate</Label>
          <Input
            type="number"
            min={1}
            value={policy.rate}
            onChange={(event) =>
              onChange({
                ...policy,
                rate: Number(event.target.value) || 1,
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label>Period (ms)</Label>
          <Input
            type="number"
            min={1000}
            step={1000}
            value={policy.period}
            onChange={(event) =>
              onChange({
                ...policy,
                period: Number(event.target.value) || 60_000,
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label>Capacity</Label>
          <Input
            type="number"
            min={1}
            value={policy.capacity ?? ''}
            onChange={(event) =>
              onChange({
                ...policy,
                capacity: Number(event.target.value) || undefined,
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label>Shards</Label>
          <Input
            type="number"
            min={1}
            value={policy.shards ?? ''}
            onChange={(event) =>
              onChange({
                ...policy,
                shards: Number(event.target.value) || undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
