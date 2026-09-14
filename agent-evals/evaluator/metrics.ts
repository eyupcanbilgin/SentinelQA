export interface ConfusionMatrix {
  labels: string[];
  matrix: number[][]; // matrix[expectedIndex][predictedIndex]
}

export interface ClassMetric {
  label: string;
  support: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface EvaluationMetrics {
  total: number;
  correct: number;
  accuracy: number;
  unknownCount: number;
  unknownRate: number;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  byClass: Record<string, ClassMetric>;
  confusionMatrix: ConfusionMatrix;
}

export function computeMetrics(
  pairs: Array<{ expected: string; predicted: string }>
): EvaluationMetrics {
  const labels = Array.from(
    new Set(pairs.flatMap(p => [p.expected, p.predicted]))
  ).sort();

  const labelToIndex = new Map(labels.map((l, i) => [l, i]));
  const matrix: number[][] = Array.from({ length: labels.length }, () =>
    new Array(labels.length).fill(0)
  );

  let correct = 0;
  for (const { expected, predicted } of pairs) {
    const expIdx = labelToIndex.get(expected)!;
    const predIdx = labelToIndex.get(predicted)!;
    matrix[expIdx][predIdx]++;
    if (expected === predicted) correct++;
  }

  const byClass: Record<string, ClassMetric> = {};
  let sumPrecision = 0;
  let sumRecall = 0;
  let sumF1 = 0;

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const truePositives = matrix[i][i];
    const support = matrix[i].reduce((a, b) => a + b, 0);
    const falsePositives = matrix.reduce((sum, row, rIdx) => rIdx !== i ? sum + row[i] : sum, 0);
    const falseNegatives = support - truePositives;

    const precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall = support > 0 ? truePositives / support : 0;
    const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    sumPrecision += precision;
    sumRecall += recall;
    sumF1 += f1;

    byClass[label] = {
      label,
      support,
      truePositives,
      falsePositives,
      falseNegatives,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1: Number(f1.toFixed(4)),
    };
  }

  const numLabels = labels.length || 1;
  const unknownCount = pairs.filter(p => p.predicted === 'UNKNOWN').length;

  return {
    total: pairs.length,
    correct,
    accuracy: Number((correct / (pairs.length || 1)).toFixed(4)),
    unknownCount,
    unknownRate: Number((unknownCount / (pairs.length || 1)).toFixed(4)),
    macroPrecision: Number((sumPrecision / numLabels).toFixed(4)),
    macroRecall: Number((sumRecall / numLabels).toFixed(4)),
    macroF1: Number((sumF1 / numLabels).toFixed(4)),
    byClass,
    confusionMatrix: {
      labels,
      matrix,
    },
  };
}
