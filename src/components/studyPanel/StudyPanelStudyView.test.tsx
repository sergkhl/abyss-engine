import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { StudyPanelStudyView } from './StudyPanelStudyView';

type StudyPanelStudyViewProps = ComponentProps<typeof StudyPanelStudyView>;

const baseProps: StudyPanelStudyViewProps = {
  renderedCard: {
    id: 'card-mcq',
    type: 'multi_choice',
    question: 'Which are prime?',
    options: ['2', '4', '3', '9'],
    correctAnswers: ['2', '3'],
    context: 'Numbers divisible by only 1 and itself are prime.',
  },
  isFlashcard: false,
  isChoiceQuestion: true,
  isSingleChoice: false,
  isMultiChoice: true,
  selectedAnswers: [],
  isAnswerSubmitted: false,
  isCorrect: false,
  isCardFlipped: false,
  sm2State: null,
  activeCard: null,
  onSelectAnswer: vi.fn(),
  onChoiceSubmit: vi.fn(),
  onChoiceContinue: vi.fn(),
  onFlip: vi.fn(),
  onRate: vi.fn(),
  getRatingLabel: vi.fn(),
  getRatingColor: vi.fn(),
  feedbackMessage: null,
  feedbackMessageDurationMs: 1500,
};

function renderStudyPanelView(override: Partial<StudyPanelStudyViewProps> = {}) {
  const container = document.createElement('div');
  const root = createRoot(container);
  const render = (props: StudyPanelStudyViewProps) => {
    flushSync(() => {
      root.render(createElement(StudyPanelStudyView, props));
    });
  };
  const mergedProps = { ...baseProps, ...override };
  render(mergedProps);

  return {
    container,
    root,
    rerender: (nextOverride: Partial<StudyPanelStudyViewProps>) => render({ ...mergedProps, ...nextOverride }),
    unmount: () => root.unmount(),
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('StudyPanelStudyView', () => {
  it('shows icon-only status markers for all option states after submit', () => {
    const { container, unmount } = renderStudyPanelView({
      selectedAnswers: ['4'],
      isAnswerSubmitted: true,
    });

    const optionOne = container.querySelector('[data-testid="study-card-choice-option-0"]') as HTMLButtonElement;
    const optionTwo = container.querySelector('[data-testid="study-card-choice-option-1"]') as HTMLButtonElement;
    const optionThree = container.querySelector('[data-testid="study-card-choice-option-2"]') as HTMLButtonElement;
    const optionFour = container.querySelector('[data-testid="study-card-choice-option-3"]') as HTMLButtonElement;

    expect(optionOne?.textContent).toContain('✓');
    expect(optionOne?.className).toContain('bg-green-900/50');

    expect(optionTwo?.textContent).toContain('✗');
    expect(optionTwo?.className).toContain('bg-red-900/50');

    expect(optionThree?.textContent).toContain('✗');
    expect(optionThree?.className).toContain('border-red-500');
    expect(optionThree?.className).not.toContain('bg-red-900/50');
    expect(optionFour?.textContent).not.toContain('✓');
    expect(optionFour?.textContent).not.toContain('✗');
    expect(optionFour?.className).not.toContain('bg-slate-800');

    unmount();
  });

  it('hides markers before submit and keeps selected option highlighted', () => {
    const { container, unmount } = renderStudyPanelView({
      selectedAnswers: ['4'],
      isAnswerSubmitted: false,
      isSingleChoice: true,
      isMultiChoice: false,
      renderedCard: {
        id: 'card-single',
        type: 'single_choice',
        question: 'Pick one',
        options: ['A', 'B', 'C'],
        correctAnswers: ['A'],
      },
    });

    const selectedOption = container.querySelector('[data-testid="study-card-choice-option-1"]') as HTMLButtonElement;
    expect(selectedOption?.textContent).not.toContain('✓');
    expect(selectedOption?.textContent).not.toContain('✗');
    expect(selectedOption?.className).toContain('bg-cyan-900/50');

    unmount();
  });

  it('preserves submit/continue and context visibility transitions', () => {
    const props: Partial<StudyPanelStudyViewProps> = {
      selectedAnswers: ['4'],
      isAnswerSubmitted: false,
    };
    const { container, rerender, unmount } = renderStudyPanelView(props);

    const submitButton = () => container.querySelector('[data-testid="study-card-submit-answer"]');
    const continueButton = () => container.querySelector('[data-testid="study-card-continue"]');

    expect(submitButton()).not.toBeNull();
    expect(continueButton()).toBeNull();
    expect(container.textContent).not.toContain('Numbers divisible by only 1 and itself are prime.');

    rerender({ ...props, isAnswerSubmitted: true });

    expect(submitButton()).toBeNull();
    expect(continueButton()).not.toBeNull();
    expect(container.textContent).toContain('Numbers divisible by only 1 and itself are prime.');

    unmount();
  });
});
