import { useModelAnimations } from '../../game/world/useModelAnimations';
import { inp } from './editorShared';

// Common fallback names when a model has no embedded clips (or none loaded yet).
const COMMON_ANIMATIONS = ['idle', 'walk', 'run', 'attack', 'wave', 'talk'];

// Kit — animation dropdown that lists the model's REAL clip names (read from the GLB), falling back to a
// common set when the model has no animations. Disabled when no model is selected. Reused by NPC / Quest
// marker / Trigger inspectors.
export const AnimationPicker = ({ modelAssetId, value, onChange }: {
  modelAssetId: string | undefined;
  value: string | undefined;
  onChange: (v: string) => void;
}) => {
  const clips = useModelAnimations(modelAssetId);
  const options = clips.length ? clips : COMMON_ANIMATIONS;
  return (
    <select value={value ?? options[0] ?? 'idle'} onChange={(e) => onChange(e.target.value)} disabled={!modelAssetId} className={inp}>
      {options.map((an) => <option key={an} value={an}>{an}</option>)}
    </select>
  );
};
