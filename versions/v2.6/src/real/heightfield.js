// Lee el mapa de alturas (relieve real) y devuelve la altura del terreno en
// cualquier punto (x, z) con interpolación suave. Si no hay datos, todo plano.
export function createHeightfield(grid) {
  if (!grid || !Array.isArray(grid.values) || grid.values.length === 0) {
    return { heightAt: () => 0 };
  }
  const { minX, minZ, cellW, cellH, cols, rows, values } = grid;

  function heightAt(x, z) {
    let fx = (x - minX) / cellW;
    let fz = (z - minZ) / cellH;
    if (fx < 0) fx = 0;
    else if (fx > cols - 1) fx = cols - 1;
    if (fz < 0) fz = 0;
    else if (fz > rows - 1) fz = rows - 1;
    const cx = Math.floor(fx);
    const cz = Math.floor(fz);
    const cx1 = Math.min(cols - 1, cx + 1);
    const cz1 = Math.min(rows - 1, cz + 1);
    const tx = fx - cx;
    const tz = fz - cz;
    const h00 = values[cz * cols + cx];
    const h10 = values[cz * cols + cx1];
    const h01 = values[cz1 * cols + cx];
    const h11 = values[cz1 * cols + cx1];
    return h00 * (1 - tx) * (1 - tz) + h10 * tx * (1 - tz) + h01 * (1 - tx) * tz + h11 * tx * tz;
  }

  return { heightAt };
}
