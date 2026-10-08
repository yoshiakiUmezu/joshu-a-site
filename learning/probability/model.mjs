export function theoreticalProbability(successfulOutcomes, totalOutcomes = 6) {
  if (!Number.isInteger(successfulOutcomes) || !Number.isInteger(totalOutcomes) || totalOutcomes < 1 || successfulOutcomes < 0 || successfulOutcomes > totalOutcomes) {
    throw new RangeError('outcome counts must be integers with 0 <= successes <= total outcomes');
  }
  return successfulOutcomes / totalOutcomes;
}

export function countSuccesses(rolls, successfulFaces) {
  if (!Array.isArray(rolls) || !Number.isInteger(successfulFaces) || successfulFaces < 0 || successfulFaces > 6) throw new RangeError('invalid die experiment');
  return rolls.filter(face => Number.isInteger(face) && face >= 1 && face <= successfulFaces).length;
}

export function simulateDie(successfulFaces, trials, random = Math.random) {
  if (!Number.isInteger(successfulFaces) || successfulFaces < 1 || successfulFaces > 6 || !Number.isInteger(trials) || trials < 1) throw new RangeError('invalid die experiment');
  const rolls = Array.from({ length: trials }, () => Math.floor(random() * 6) + 1);
  return { rolls, hits: countSuccesses(rolls, successfulFaces), observedProbability: countSuccesses(rolls, successfulFaces) / trials };
}
