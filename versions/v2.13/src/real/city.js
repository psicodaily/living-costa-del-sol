import * as THREE from "three";
import { buildBuildings } from "./buildings.js";
import { buildGround } from "./ground.js";
import { createTrees } from "./trees.js";
import { createHeightfield } from "./heightfield.js";

export function createRealCity(data) {
  const group = new THREE.Group();

  // El DEM no "excava" las marinas (las lee como tierra de 1-4 m), así que el
  // mar no se vería ahí. Bajamos a nivel del mar las celdas dentro de cada
  // marina para que el agua aparezca y los yates floten.
  carveMarinas(data.heightGrid, data.areas);

  // Relieve real (cuestas). Si no hay datos, queda plano.
  const { heightAt } = createHeightfield(data.heightGrid);

  group.add(buildGround(data, heightAt));

  const { meshes, cityBoxes } = buildBuildings(data.buildings, heightAt);
  for (const m of meshes) group.add(m);

  group.add(createTrees(data, 1600, heightAt));

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const box of cityBoxes) {
    if (box.x < minX) minX = box.x;
    if (box.x > maxX) maxX = box.x;
    if (box.z < minZ) minZ = box.z;
    if (box.z > maxZ) maxZ = box.z;
  }
  return { group, cityBoxes, bounds: { minX, maxX, minZ, maxZ }, heightAt };
}

// Pone a 0 (nivel del mar) las celdas de altura cuyo nodo cae dentro de una
// marina, para que el mar global se vea en la dársena y los barcos floten.
function carveMarinas(grid, areas) {
  if (!grid || !Array.isArray(grid.values)) return;
  const marinas = (areas || []).filter((a) => a.kind === "marina" && a.polygon && a.polygon.length >= 3);
  if (!marinas.length) return;
  const pip = (x, z, r) => {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, zi] = r[i], [xj, zj] = r[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  const { cols, rows } = grid;
  const mark = new Uint8Array(cols * rows);
  for (let z = 0; z < rows; z++) {
    const wz = grid.minZ + z * grid.cellH;
    for (let x = 0; x < cols; x++) {
      const wx = grid.minX + x * grid.cellW;
      for (const m of marinas) {
        if (pip(wx, wz, m.polygon)) { mark[z * cols + x] = 1; break; }
      }
    }
  }
  // EROSIÓN: solo excavamos las celdas cuyos 4 vecinos también están dentro.
  // Así el borde (muelle/paseo) se queda en tierra y NO se inundan calles ni
  // edificios; el interior baja a agua profunda para que se vea el mar.
  const WATER_FLOOR = -3;
  for (let z = 1; z < rows - 1; z++) for (let x = 1; x < cols - 1; x++) {
    const k = z * cols + x;
    if (mark[k] && mark[k - 1] && mark[k + 1] && mark[k - cols] && mark[k + cols]) {
      grid.values[k] = WATER_FLOOR;
    }
  }
}
