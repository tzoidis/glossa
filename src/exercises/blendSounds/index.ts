import type { ExerciseModule } from '../types.ts';
import { BlendSounds } from './BlendSounds.tsx';
import { BLEND_SOUNDS_ID, generateBlendSounds } from './generate.ts';

export const blendSounds: ExerciseModule = {
  id: BLEND_SOUNDS_ID,
  requires: { skills: [], minGraphemes: 0, needs: ['image', 'phonemeAudio'] },
  generate: generateBlendSounds,
  Component: BlendSounds,
};
