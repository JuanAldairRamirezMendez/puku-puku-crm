const EUCLIDEAN = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

function randomCentroids(data, k) {
  const idx = new Set();
  while (idx.size < k) idx.add(Math.floor(Math.random() * data.length));
  return Array.from(idx).map((i) => [...data[i]]);
}

function kmeansPlusPlus(data, k, distFn = EUCLIDEAN) {
  const centroids = [[...data[Math.floor(Math.random() * data.length)]]];
  for (let c = 1; c < k; c++) {
    const dists = data.map((p) => Math.min(...centroids.map((cen) => distFn(p, cen) ** 2)));
    const total = dists.reduce((s, d) => s + d, 0);
    let r = Math.random() * total;
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i];
      if (r <= 0) { centroids.push([...data[i]]); break; }
    }
  }
  return centroids;
}

function kmeans(data, k = 3, { maxIter = 100, init = 'kmeans++', distFn = EUCLIDEAN } = {}) {
  if (data.length === 0) return { centroids: [], assignments: [], inertia: 0, iterations: 0 };
  if (data.length <= k) {
    return {
      centroids: data.map((p) => [...p]),
      assignments: data.map((_, i) => i),
      inertia: 0,
      iterations: 0,
    };
  }

  let centroids = init === 'kmeans++' ? kmeansPlusPlus(data, k, distFn) : randomCentroids(data, k);
  let assignments = new Array(data.length).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;
    let changed = false;

    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity, best = 0;
      for (let j = 0; j < k; j++) {
        const d = distFn(data[i], centroids[j]);
        if (d < minDist) { minDist = d; best = j; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }

    if (!changed) break;

    const sums = Array.from({ length: k }, () => new Array(data[0].length).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < data.length; i++) {
      const a = assignments[i];
      counts[a]++;
      for (let d = 0; d < data[i].length; d++) sums[a][d] += data[i][d];
    }
    for (let j = 0; j < k; j++) {
      if (counts[j] > 0) {
        for (let d = 0; d < data[0].length; d++) centroids[j][d] = sums[j][d] / counts[j];
      } else {
        centroids[j] = [...data[Math.floor(Math.random() * data.length)]];
      }
    }
  }

  const inertia = data.reduce((s, p, i) => s + distFn(p, centroids[assignments[i]]) ** 2, 0);
  return { centroids, assignments, inertia, iterations };
}

module.exports = { kmeans };
