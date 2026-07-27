export type QuantStage = 'boot' | 'question' | 'install' | 'prompt' | 'art' | 'declined';

export type QuantEvent =
  | 'boot-complete'
  | 'answer-wrong'
  | 'answer-right'
  | 'install-complete'
  | 'decline'
  | 'accept'
  | 'exit-art';

export function nextQuantStage(stage: QuantStage, event: QuantEvent): QuantStage {
  if (stage === 'boot' && event === 'boot-complete') return 'question';
  if (stage === 'question' && event === 'answer-wrong') return 'question';
  if (stage === 'question' && event === 'answer-right') return 'install';
  if (stage === 'install' && event === 'install-complete') return 'prompt';
  if (stage === 'prompt' && event === 'decline') return 'declined';
  if (stage === 'prompt' && event === 'accept') return 'art';
  if (stage === 'art' && event === 'exit-art') return 'prompt';

  return stage;
}
