import { useInteractionStore } from '../stores/interactionStore';

// Kit — the floating "[E] …" hint shown whenever the player is within range of an interactable.
export const InteractionPrompt = () => {
  const currentTargetId = useInteractionStore((s) => s.currentTargetId);
  const actionLabel = useInteractionStore((s) => s.actionLabel);

  if (!currentTargetId) return null;

  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-lg border-2 border-yellow-400/90 bg-slate-900/85 px-6 py-3 text-base font-medium text-yellow-50 shadow-xl backdrop-blur-md">
      <span className="animate-pulse font-bold text-yellow-300">[E]</span> {actionLabel}
    </div>
  );
};
