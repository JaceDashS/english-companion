# English Vocabulary

## Requirements
- A word has meaning, provided example text in decomposition, multiple etymological roots and a separate unique learner example note.
- Root browsing spans all owned vocabulary materials. Several roots are allowed; absent roots are explicit and never guessed.
- A copyable prompt accepts a free-form word list and returns versioned import JSON. Import validates roots and eight distinct structural question patterns per word, each with four unique sentences and one intended best answer.
- Quiz sentences differ from provided study examples and previously displayed choices. Used sentences persist across sessions and devices and remain used after imports or material edits.
- Exhaustion shows a replenishment message rather than recycling sentences or inventing results. No live AI provider is called.

## Example
- Input: A word with eight imported question sets.
- Steps: Open a quiz, return, and open another quiz until the pool is exhausted.
- Expected result: No displayed choice repeats; the final attempt asks for new imported sets.

- Design: [Implementation](../../design/app/50-english-vocabulary.md)
- Scenarios: [Cases](../../testing/scenarios/app/50-english-vocabulary.md)
