import type { CapacityType, CreateMissionInput, MissionVisibility, UpdateMissionInput } from './missions';

export type NormalizedCreateInput = {
  title: string;
  description: string;
  capacity_type: CapacityType;
  capacity: number | null;
  grid_ref: string | null;
  visibility: MissionVisibility;
  expires_at: string | null;
  requires_presence: boolean;
  requires_verification: boolean;
};

export type Validation<T> = { data: T; error: null } | { data: null; error: string };

export function isCapacityType(value: unknown): value is CapacityType {
  return value === 'open' || value === 'limited' || value === 'exclusive';
}

export function isVisibility(value: unknown): value is MissionVisibility {
  return value === 'public' || value === 'hidden';
}

export function validLimitedCapacity(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

export function validateTitle(title: unknown): Validation<string> {
  if (typeof title !== 'string') return { data: null, error: 'A mission title is required.' };

  const trimmed = title.trim();
  if (trimmed.length < 1 || trimmed.length > 140) {
    return { data: null, error: 'Mission titles must be between 1 and 140 characters.' };
  }

  return { data: trimmed, error: null };
}

export function validateDescription(description: unknown): Validation<string> {
  if (typeof description !== 'string') return { data: null, error: 'Mission descriptions must be text.' };
  if (description.length > 4000) return { data: null, error: 'Mission descriptions can be at most 4000 characters.' };

  return { data: description, error: null };
}

function normalizedGridRef(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() || null : null;
}

function validateBoolean(value: unknown, message: string): Validation<boolean> {
  if (typeof value !== 'boolean') return { data: null, error: message };
  return { data: value, error: null };
}

export function normalizeCreateInput(input: CreateMissionInput): Validation<NormalizedCreateInput> {
  const title = validateTitle(input.title);
  if (title.error !== null) return { data: null, error: title.error };

  const description = validateDescription(input.description ?? '');
  if (description.error !== null) return { data: null, error: description.error };

  if (!isCapacityType(input.capacity_type)) {
    return { data: null, error: 'Choose an open, limited, or exclusive capacity.' };
  }

  if (input.visibility !== undefined && !isVisibility(input.visibility)) {
    return { data: null, error: 'Mission visibility must be public or hidden.' };
  }

  const requiresPresence = input.requires_presence ?? false;
  const presence = validateBoolean(requiresPresence, 'Presence requirement must be true or false.');
  if (presence.error !== null) return { data: null, error: presence.error };

  const requiresVerification = input.requires_verification ?? false;
  const verification = validateBoolean(requiresVerification, 'Verification requirement must be true or false.');
  if (verification.error !== null) return { data: null, error: verification.error };

  let capacity: number | null;
  if (input.capacity_type === 'open') {
    if (input.capacity !== undefined && input.capacity !== null) {
      return { data: null, error: 'Open missions cannot have a capacity.' };
    }
    capacity = null;
  } else if (input.capacity_type === 'exclusive') {
    if (input.capacity !== undefined && input.capacity !== null && input.capacity !== 1) {
      return { data: null, error: 'Exclusive missions must have a capacity of 1.' };
    }
    capacity = 1;
  } else {
    if (!validLimitedCapacity(input.capacity)) {
      return { data: null, error: 'Limited missions need a whole-number capacity of at least 1.' };
    }
    capacity = input.capacity;
  }

  const grid_ref = normalizedGridRef(input.grid_ref);
  if (presence.data && !grid_ref) return { data: null, error: 'A here-only mission needs a grid square.' };

  return {
    data: {
      title: title.data,
      description: description.data,
      capacity_type: input.capacity_type,
      capacity,
      grid_ref,
      visibility: input.visibility ?? 'public',
      expires_at: input.expires_at ?? null,
      requires_presence: presence.data,
      requires_verification: verification.data
    },
    error: null
  };
}

export function normalizeUpdateInput(input: UpdateMissionInput): Validation<UpdateMissionInput> {
  const patch: UpdateMissionInput = {};

  if ('title' in input) {
    const title = validateTitle(input.title);
    if (title.error !== null) return { data: null, error: title.error };
    patch.title = title.data;
  }

  if ('description' in input) {
    const description = validateDescription(input.description);
    if (description.error !== null) return { data: null, error: description.error };
    patch.description = description.data;
  }

  if ('visibility' in input) {
    if (!isVisibility(input.visibility)) return { data: null, error: 'Mission visibility must be public or hidden.' };
    patch.visibility = input.visibility;
  }

  if ('is_closed' in input) {
    if (typeof input.is_closed !== 'boolean') return { data: null, error: 'Closed status must be true or false.' };
    patch.is_closed = input.is_closed;
  }

  const grid_ref = 'grid_ref' in input ? normalizedGridRef(input.grid_ref) : undefined;
  if (grid_ref !== undefined) patch.grid_ref = grid_ref;
  if ('expires_at' in input) patch.expires_at = input.expires_at ?? null;

  if ('requires_presence' in input) {
    const presence = validateBoolean(input.requires_presence, 'Presence requirement must be true or false.');
    if (presence.error !== null) return { data: null, error: presence.error };
    if (presence.data && !grid_ref) return { data: null, error: 'A here-only mission needs a grid square.' };
    patch.requires_presence = presence.data;
  }

  if ('requires_verification' in input) {
    const verification = validateBoolean(input.requires_verification, 'Verification requirement must be true or false.');
    if (verification.error !== null) return { data: null, error: verification.error };
    patch.requires_verification = verification.data;
  }

  if ('capacity_type' in input) {
    if (!isCapacityType(input.capacity_type)) {
      return { data: null, error: 'Choose an open, limited, or exclusive capacity.' };
    }

    patch.capacity_type = input.capacity_type;
    if (input.capacity_type === 'open') {
      if (input.capacity !== undefined && input.capacity !== null) {
        return { data: null, error: 'Open missions cannot have a capacity.' };
      }
      patch.capacity = null;
    } else if (input.capacity_type === 'exclusive') {
      if (input.capacity !== undefined && input.capacity !== null && input.capacity !== 1) {
        return { data: null, error: 'Exclusive missions must have a capacity of 1.' };
      }
      patch.capacity = 1;
    } else {
      if (!validLimitedCapacity(input.capacity)) {
        return { data: null, error: 'Limited missions need a whole-number capacity of at least 1.' };
      }
      patch.capacity = input.capacity;
    }
  } else if ('capacity' in input) {
    return { data: null, error: 'Choose a capacity type before changing capacity.' };
  }

  if (Object.keys(patch).length === 0) return { data: null, error: 'Choose at least one mission field to update.' };

  return { data: patch, error: null };
}

export function canClaimHere(
  mission: { requires_presence: boolean; grid_ref: string | null },
  currentCell: string | null,
  canonicalize: (code: string) => string | null
): boolean {
  if (!mission.requires_presence) return true;
  if (!mission.grid_ref || !currentCell) return false;

  const missionCell = canonicalize(mission.grid_ref);
  return missionCell !== null && missionCell === canonicalize(currentCell);
}
