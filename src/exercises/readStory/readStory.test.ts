import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../app/content.ts';
import { isTextAllowed, makeContext } from '../../engine/allowedWords.ts';
import { pictureUrl } from '../../ui/Picture.tsx';
import { cases, tryGenerate } from '../propertyTest.ts';
import type { StoryItem } from './generate.ts';
import { readStory } from './index.ts';

describe('read-story property test', () => {
  it('shows only readable stories and questions, with the answer among distinct pictures', () => {
    let generated = 0;
    for (const c of cases()) {
      const round = tryGenerate(readStory, c);
      if (!round) continue;
      generated++;
      const allow = makeContext(CONTENT.curriculum, { position: c.position }, CONTENT.words);
      const items = round.items as StoryItem[];
      expect(items, c.label).toHaveLength(5);
      for (const item of items) {
        const story = CONTENT.stories.find((s) => s.id === item.storyId)!;
        const q = story.questions[item.question]!;
        for (const text of [...item.lines, item.prompt]) expect(isTextAllowed(text, allow), `${c.label}: «${text}»`).toBe(true);
        expect(item.target, c.label).toBe(q.imageChoices[q.answer]);
        expect(item.options, c.label).toContain(item.target);
        expect(new Set(item.options).size, c.label).toBe(item.options.length);
      }
      expect(new Set(items.map((i) => `${i.storyId}:${i.question}`)).size, c.label).toBe(items.length);
    }
    expect(generated).toBeGreaterThan(0);
  });

  it('is offered by the end of unit 2', () => {
    const at = (p: number) => [...cases()].find((c) => c.position === p)!;
    expect(tryGenerate(readStory, at(18))).not.toBeNull();
  });
});

describe('stories', () => {
  it('have 2-5 sentences, 1-2 questions and bundled pictures', () => {
    for (const s of CONTENT.stories) {
      expect(s.sentences.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.sentences.length, s.id).toBeLessThanOrEqual(5);
      expect(s.questions.length, s.id).toBeGreaterThanOrEqual(1);
      expect(s.questions.length, s.id).toBeLessThanOrEqual(2);
      for (const q of s.questions) {
        expect(q.prompt, s.id).toMatch(/;$/);
        for (const code of q.imageChoices) expect(pictureUrl(code), `${s.id} ${code}`).toBeDefined();
      }
    }
  });
});
