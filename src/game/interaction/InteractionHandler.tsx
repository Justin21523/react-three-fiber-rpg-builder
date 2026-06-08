import { useEffect } from 'react';
import { useInteractionStore } from '../../stores/interactionStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useWorldStore } from '../../stores/worldStore';
import { getKitArea } from '../../data/areas';
import { arrivalSpawn } from '../world/gateLayout';

// Kit — non-visual [E] dispatcher. Reads the current interaction target (set by sensor colliders on
// gates / NPCs / items / doors) and acts on it. Phase B handles travel gates; Phase C adds the
// npc / item / door branches (dialogue, pickup, locked-door checks). Renders nothing.
export const InteractionHandler = () => {
  const currentTargetId = useInteractionStore((s) => s.currentTargetId);
  const targetType = useInteractionStore((s) => s.targetType);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || e.repeat || !currentTargetId || !targetType) return;
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (targetType === 'gate') {
        const target = getKitArea(currentTargetId);
        if (!target) return;
        const fromAreaId = usePlayerStore.getState().currentAreaId;
        // Drop the player just inside the gate that leads back to where they came from.
        const spawn = arrivalSpawn(target.id, fromAreaId);
        usePlayerStore.getState().travelToArea(target.id, spawn);
        useWorldStore.getState().discoverArea(target.id);
        useInteractionStore.getState().clearTarget(target.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentTargetId, targetType]);

  return null;
};
