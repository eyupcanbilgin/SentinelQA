import { validateProposedPatch, type GuardrailCheckResult } from './guardrails.js';

export interface HealingProposal {
  testId: string;
  targetFile: string;
  suggestedPatch: string;
  explanation: string;
  guardrailResult: GuardrailCheckResult;
}

export function proposeHealing(options: {
  testId: string;
  targetFile: string;
  originalCode: string;
  healedCode: string;
  explanation: string;
}): HealingProposal {
  const patchLines = [
    `--- a/${options.targetFile}`,
    `+++ b/${options.targetFile}`,
    '@@ -1 +1 @@',
  ];

  const origLines = options.originalCode.split('\n');
  const healedLines = options.healedCode.split('\n');

  origLines.forEach(l => patchLines.push(`-${l}`));
  healedLines.forEach(l => patchLines.push(`+${l}`));

  const diff = patchLines.join('\n');
  const guardrailResult = validateProposedPatch(diff, options.targetFile);

  return {
    testId: options.testId,
    targetFile: options.targetFile,
    suggestedPatch: diff,
    explanation: options.explanation,
    guardrailResult,
  };
}
