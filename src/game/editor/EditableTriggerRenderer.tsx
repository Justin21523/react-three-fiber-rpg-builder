import { useEffect, Suspense } from 'react';
import { DoubleSide } from 'three';
import { Text } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { EditorTrigger, EditorTriggerDisplayMode } from '../../types/editorTrigger';
import { CONTACT_TRIGGER_TYPES, TRIGGER_COLOR, gateConfig } from '../../types/editorTrigger';
import { useUiStore } from '../../stores/uiStore';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { useInteractionStore } from '../../stores/interactionStore';
import { useSceneEditStore, useMergedTransform } from '../../stores/sceneEditStore';
import { EditablePlacement, ProxyBox } from '../edit/EditablePlacement';
import { objKey } from '../edit/sceneEditMerge';
import { SceneGlbModel } from '../world/SceneGlbModel';
import { evaluateTrigger } from './evaluateTrigger';
import { fireEditorTrigger } from './fireEditorTrigger';

// Kit — renders Editor triggers. Edit Mode: each is a full EditablePlacement (selectable, gizmo-movable,
// deletable). Play: a Rapier sensor at the merged transform that sets the interaction target on enter.
const TriggerVisual = ({ trigger, selected, displayMode }: { trigger: EditorTrigger; selected: boolean; displayMode: EditorTriggerDisplayMode }) => {
  const color = trigger.color ?? TRIGGER_COLOR[trigger.triggerType];
  const [sx, sy, sz] = trigger.size;
  const ev = displayMode === 'debug' ? evaluateTrigger(trigger) : null;
  const isGate = trigger.triggerType === 'travelGate' || trigger.triggerType === 'zoneGate';
  const gateTarget = isGate ? gateConfig(trigger).targetAreaId : undefined;
  const label = trigger.displayName || trigger.triggerType;
  return (
    <group>
      {trigger.displayModelAssetId && <Suspense fallback={null}><SceneGlbModel assetId={trigger.displayModelAssetId} /></Suspense>}
      {displayMode !== 'marker' && (
        <mesh position={[0, sy / 2, 0]}>
          <boxGeometry args={[sx, sy, sz]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? 0.4 : 0.18} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[Math.max(sx, sz) / 2, Math.max(sx, sz) / 2 + 0.25, 24]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.95 : 0.6} side={DoubleSide} />
      </mesh>
      <Text position={[0, sy + 0.35, 0]} fontSize={0.24} color="#e2e8f0" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
        {gateTarget ? `${label} → ${gateTarget}` : `${label} · ${trigger.triggerType}`}
      </Text>
      {displayMode === 'debug' && ev && (
        <Text position={[0, sy + 0.68, 0]} fontSize={0.18} color={ev.active ? '#86efac' : '#fca5a5'} anchorX="center" anchorY="middle" outlineWidth={0.018} outlineColor="#000000">
          {ev.active ? '✓ active' : `✗ ${ev.reasons.join(', ')}`}
        </Text>
      )}
    </group>
  );
};

const TriggerSensor = ({ trigger }: { trigger: EditorTrigger }) => {
  const setTarget = useInteractionStore((s) => s.setTarget);
  const clearTarget = useInteractionStore((s) => s.clearTarget);
  const key = objKey(trigger.zoneId, 'trigger', trigger.id);
  const m = useMergedTransform(key, { position: trigger.position, rotation: trigger.rotation, scale: trigger.scale });
  const [sx, sy, sz] = trigger.size;
  const s = m.scale;
  const isContact = CONTACT_TRIGGER_TYPES.has(trigger.triggerType);
  return (
    <RigidBody type="fixed" colliders={false} position={m.position} rotation={m.rotation}>
      <CuboidCollider
        args={[(sx * s) / 2, (sy * s) / 2, (sz * s) / 2]}
        position={[0, (sy * s) / 2, 0]}
        sensor
        onIntersectionEnter={() => {
          if (isContact) fireEditorTrigger(trigger);
          else setTarget(trigger.id, 'editorTrigger', trigger.interactionLabel || trigger.triggerType);
        }}
        onIntersectionExit={() => { if (!isContact) clearTarget(trigger.id); }}
      />
    </RigidBody>
  );
};

export const EditableTriggerRenderer = ({ areaId }: { areaId: string }) => {
  const editMode = useUiStore((s) => s.editMode);
  const triggers = useEditorTriggerStore((s) => s.triggers);
  const displayMode = useEditorTriggerStore((s) => s.displayMode);
  const selectedTriggerId = useEditorTriggerStore((s) => s.selectedTriggerId);
  const selectTrigger = useEditorTriggerStore((s) => s.selectTrigger);
  const removeTrigger = useEditorTriggerStore((s) => s.removeTrigger);
  const selectedKey = useSceneEditStore((s) => s.selectedKey);
  const deleted = useSceneEditStore((s) => s.deleted);
  const areaTriggers = triggers.filter((t) => t.zoneId === areaId);

  // Selecting a trigger via the viewport gizmo opens it in the inspector.
  useEffect(() => {
    if (!selectedKey) return;
    const parts = selectedKey.split('#');
    if (parts[1] === 'trigger' && triggers.some((t) => t.id === parts[2])) selectTrigger(parts[2]);
  }, [selectedKey, triggers, selectTrigger]);

  // Deleting a trigger via the gizmo removes it for real.
  useEffect(() => {
    for (const t of triggers) if (deleted[objKey(t.zoneId, 'trigger', t.id)]) removeTrigger(t.id);
  }, [deleted, triggers, removeTrigger]);

  if (editMode) {
    return <>{areaTriggers.map((t) => (
      <EditablePlacement
        key={t.id}
        objKey={objKey(areaId, 'trigger', t.id)}
        basePosition={t.position}
        baseRotation={t.rotation}
        baseScale={t.scale}
        proxy={<ProxyBox size={t.size} color={t.color ?? TRIGGER_COLOR[t.triggerType]} />}
        editVisual={<TriggerVisual trigger={t} selected={selectedTriggerId === t.id} displayMode={displayMode} />}
        render={() => null}
      />
    ))}</>;
  }
  return <>{areaTriggers
    .filter((t) => t.isEnabled !== false && t.isVisibleInPlayMode !== false)
    .map((t) => <TriggerSensor key={t.id} trigger={t} />)}</>;
};
