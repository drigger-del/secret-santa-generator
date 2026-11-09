/**
 * Secret Santa assignment algorithm.
 *
 * Finds a valid permutation (derangement) of participants such that:
 *  - nobody gives to themselves,
 *  - all mutual exclusion rules are respected (both directions),
 *  - when preventReciprocal is on, no two-person cycles (A->B and B->A),
 *  - every participant gives exactly one gift and receives exactly one gift.
 *
 * Uses a backtracking search with bipartite-matching feasibility pruning
 * (Kuhn's algorithm). It is sound and complete: if a valid assignment
 * exists it will find one; if none exists it reports failure.
 */

function buildBaseForbidden(n, idToIndex, exclusions) {
  const baseForbidden = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) {
    baseForbidden[i].add(i); // nobody gets themselves
  }
  for (const e of exclusions || []) {
    const ai = idToIndex[e.participant_a_id];
    const bi = idToIndex[e.participant_b_id];
    if (ai !== undefined && bi !== undefined) {
      baseForbidden[ai].add(bi); // A cannot give to B
      baseForbidden[bi].add(ai); // B cannot give to A (mutual)
    }
  }
  return baseForbidden;
}

/**
 * Feasibility check: can every currently unassigned giver still be matched
 * to a distinct, allowed recipient? Standard Kuhn augmenting-path matching.
 */
function makeIsFeasible(n, assignment, used, dynamicForbidden) {
  return function isFeasible() {
    const unassigned = [];
    for (let i = 0; i < n; i++) {
      if (assignment[i] === -1) unassigned.push(i);
    }
    if (unassigned.length === 0) return true;

    const availableRecipients = [];
    for (let j = 0; j < n; j++) {
      if (!used[j]) availableRecipients.push(j);
    }

    const matchR = new Array(n).fill(-1); // recipient j -> matched giver

    function tryKuhn(g, visited) {
      const options = [];
      for (const j of availableRecipients) {
        if (!dynamicForbidden[g].has(j)) options.push(j);
      }
      for (const j of options) {
        if (visited[j]) continue;
        visited[j] = true;
        if (matchR[j] === -1 || tryKuhn(matchR[j], visited)) {
          matchR[j] = g;
          return true;
        }
      }
      return false;
    };

    let matched = 0;
    for (const g of unassigned) {
      const visited = new Array(n).fill(false);
      if (tryKuhn(g, visited)) matched++;
    }
    return matched === unassigned.length;
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[k]] = [arr[k], arr[i]];
  }
  return arr;
}

/**
 * Single backtracking attempt. Returns the recipient index per giver index,
 * or null if no valid completion exists from this state.
 */
function findAssignment(n, baseForbidden, preventReciprocal) {
  const assignment = new Array(n).fill(-1); // giverIdx -> recipientIdx
  const used = new Array(n).fill(false);
  const dynamicForbidden = baseForbidden.map((s) => new Set(s));
  const isFeasible = makeIsFeasible(n, assignment, used, dynamicForbidden);

  function search() {
    // MRV heuristic: pick unassigned giver with fewest available recipients.
    let bestG = -1;
    let bestOptions = null;

    for (let i = 0; i < n; i++) {
      if (assignment[i] !== -1) continue;
      const options = [];
      for (let j = 0; j < n; j++) {
        if (!used[j] && !dynamicForbidden[i].has(j)) {
          options.push(j);
        }
      }
      if (options.length === 0) return false; // dead end
      if (bestG === -1 || options.length < bestOptions.length) {
        bestG = i;
        bestOptions = options;
      }
    }

    if (bestG === -1) return true; // everyone assigned

    shuffle(bestOptions);
    for (const j of bestOptions) {
      // Tentatively assign bestG -> j.
      assignment[bestG] = j;
      used[j] = true;

      let addedReverse = false;
      if (preventReciprocal && assignment[j] === -1) {
        // If bestG gives to j, then j must not give back to bestG.
        if (!dynamicForbidden[j].has(bestG)) {
          dynamicForbidden[j].add(bestG);
          addedReverse = true;
        }
      }

      if (isFeasible() && search()) {
        return true;
      }

      // Undo the tentative assignment.
      if (addedReverse) dynamicForbidden[j].delete(bestG);
      used[j] = false;
      assignment[bestG] = -1;
    }
    return false;
  }

  return search() ? assignment : null;
}

/**
 * Server-side validation of a complete assignment. Throws on any violation.
 */
function validateAssignment(participants, exclusions, assignments, preventReciprocal) {
  const n = participants.length;
  const idToIndex = {};
  participants.forEach((p, i) => {
    idToIndex[p.id] = i;
  });

  const forbidden = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) forbidden[i].add(i);
  for (const e of exclusions || []) {
    const ai = idToIndex[e.participant_a_id];
    const bi = idToIndex[e.participant_b_id];
    if (ai !== undefined && bi !== undefined) {
      forbidden[ai].add(bi);
      forbidden[bi].add(ai);
    }
  }

  const givesTo = new Array(n).fill(-1); // giverIdx -> recipientIdx
  const givenBy = new Array(n).fill(-1); // recipientIdx -> giverIdx

  for (const a of assignments) {
    const gi = idToIndex[a.giver_id];
    const ri = idToIndex[a.recipient_id];
    if (gi === undefined || ri === undefined) {
      throw new Error('Invalid participant in assignment.');
    }
    if (gi === ri) throw new Error('Participant assigned to themselves.');
    if (forbidden[gi].has(ri)) {
      throw new Error('Assignment violates an exclusion rule.');
    }
    if (givesTo[gi] !== -1) throw new Error('Giver assigned multiple recipients.');
    if (givenBy[ri] !== -1) throw new Error('Recipient has multiple givers.');
    givesTo[gi] = ri;
    givenBy[ri] = gi;
  }

  for (let i = 0; i < n; i++) {
    if (givesTo[i] === -1) throw new Error('Participant gives no gift.');
    if (givenBy[i] === -1) throw new Error('Participant receives no gift.');
  }

  if (preventReciprocal) {
    for (let i = 0; i < n; i++) {
      const j = givesTo[i];
      if (givesTo[j] === i) {
        throw new Error('Reciprocal assignment detected.');
      }
    }
  }
}

/**
 * Public entry point. Returns an array of { giver_id, recipient_id } or
 * null if no valid assignment exists with the current rules.
 */
function generateDraw(participants, exclusions, preventReciprocal) {
  if (!Array.isArray(participants) || participants.length < 3) {
    throw new Error(
      'At least 3 participants are required to generate a draw.'
    );
  }

  const n = participants.length;
  const idToIndex = {};
  participants.forEach((p, i) => {
    idToIndex[p.id] = i;
  });

  const baseForbidden = buildBaseForbidden(n, idToIndex, exclusions);

  const IMPOSSIBLE_MESSAGE =
    'No valid Secret Santa assignment is possible with the current exclusion rules. Please review your exclusions.';

  // Try multiple randomized attempts. Each attempt is pruned by feasibility
  // checks, so this is fast in practice and never returns an invalid result.
  for (let attempt = 0; attempt < 12; attempt++) {
    const assignment = findAssignment(n, baseForbidden, preventReciprocal);
    if (assignment) {
      const results = [];
      for (let i = 0; i < n; i++) {
        results.push({
          giver_id: participants[i].id,
          recipient_id: participants[assignment[i]].id,
        });
      }
      // Validate before returning: never save an invalid assignment.
      validateAssignment(participants, exclusions, results, preventReciprocal);
      return results;
    }
  }

  return null;
}

module.exports = { generateDraw };
