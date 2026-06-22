// Genera ue5/import_puertobanus.py a partir de ue5/puertobanus_blockout.json
// Para cada edificio calcula su CAJA ORIENTADA (OBB) por PCA -> centro, ancho,
// fondo, ángulo. Luego lo convierte a coordenadas de Unreal (cm, Z arriba) y
// escribe un .py AUTOCONTENIDO que, ejecutado en UE, crea la maqueta gris.
//
// Mapeo de ejes (datos -> Unreal):
//   datos: x = ESTE (m), z = SUR (m)
//   UE:    X = NORTE = -z ,  Y = ESTE = x ,  Z = ARRIBA ; 1 m = 100 uu
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("ue5/puertobanus_blockout.json", "utf8"));
const MIN = 3; // tamaño mínimo de caja (m) para no tener cajas de grosor 0

// Caja orientada mínima por PCA (suficiente para una maqueta)
function obb(pts) {
  const n = pts.length;
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x; cz += z; }
  cx /= n; cz /= n;
  let a = 0, b = 0, c = 0;
  for (const [x, z] of pts) { const dx = x - cx, dz = z - cz; a += dx * dx; b += dx * dz; c += dz * dz; }
  a /= n; b /= n; c /= n;
  let ang;
  if (Math.abs(b) < 1e-9 && Math.abs(a - c) < 1e-9) ang = 0;
  else ang = 0.5 * Math.atan2(2 * b, a - c);
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const vx = -uz, vz = ux;
  let umin = 1e9, umax = -1e9, vmin = 1e9, vmax = -1e9;
  for (const [x, z] of pts) {
    const dx = x - cx, dz = z - cz;
    const u = dx * ux + dz * uz, v = dx * vx + dz * vz;
    if (u < umin) umin = u; if (u > umax) umax = u;
    if (v < vmin) vmin = v; if (v > vmax) vmax = v;
  }
  const w = Math.max(MIN, umax - umin);
  const d = Math.max(MIN, vmax - vmin);
  const uc = (umin + umax) / 2, vc = (vmin + vmax) / 2;
  const ccx = cx + uc * ux + vc * vx;
  const ccz = cz + uc * uz + vc * vz;
  return { cx: ccx, cz: ccz, w, d, ang };
}

const r1 = (v) => Math.round(v * 10) / 10;
const boxes = [];
for (const b of data.buildings) {
  const o = obb(b.footprint);
  const h = Math.max(6, b.height || 9);
  // a Unreal (cm)
  const X = r1(-o.cz * 100);          // norte
  const Y = r1(o.cx * 100);           // este
  const Zc = r1((h * 100) / 2);       // base apoyada en Z=0
  // yaw: el eje mayor (ux,uz) en datos -> dir UE (-uz, ux); yaw = atan2(ux, -uz)
  const yaw = r1((Math.atan2(Math.cos(o.ang), -Math.sin(o.ang)) * 180) / Math.PI);
  boxes.push([X, Y, Zc, yaw, r1(o.w), r1(o.d), h]);
}

const lines = boxes.map((t) => "    (" + t.join(",") + "),").join("\n");
const py = `# -*- coding: utf-8 -*-
# ============================================================================
#  Puerto Banus -> Unreal Engine  (MAQUETA GRIS / blockout)
#  Generado por tools/ue5_make_pyimport.mjs a partir de datos reales (OSM).
#  Crea ${boxes.length} edificios como cajas grises + un suelo grande.
#  Re-ejecutable: borra la maqueta anterior antes de crear la nueva.
#
#  Formato de cada caja: (X, Y, Zcentro, Yaw_grados, EscalaX, EscalaY, EscalaZ)
#  en unidades de Unreal (cm). 1 m = 100 uu. La caja base de Unreal mide 1 m,
#  asi que la escala = metros.
# ============================================================================
import unreal

FOLDER = "PuertoBanus/Blockout"

# [X, Y, Zc, yaw, sx, sy, sz]
BOXES = [
${lines}
]

actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

# 1) Borrar la maqueta anterior (por carpeta) para poder re-ejecutar sin duplicar
previos = [a for a in actors.get_all_level_actors() if str(a.get_folder_path()) == FOLDER]
for a in previos:
    actors.destroy_actor(a)
print("Borrados %d actores de una importacion anterior." % len(previos))

cube = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube")
plane = unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Plane")

def spawn(mesh, x, y, z, yaw, sx, sy, sz, label):
    a = actors.spawn_actor_from_object(mesh, unreal.Vector(x, y, z), unreal.Rotator(0.0, 0.0, yaw))
    a.set_actor_scale3d(unreal.Vector(sx, sy, sz))
    a.set_folder_path(FOLDER)
    a.set_actor_label(label)
    return a

# 2) Suelo grande (4 km) un pelin por debajo de 0 para evitar parpadeo con el suelo del template
spawn(plane, 0.0, 0.0, -2.0, 0.0, 4000.0, 4000.0, 1.0, "PB_Suelo")

# 3) Edificios
for i, (x, y, z, yaw, sx, sy, sz) in enumerate(BOXES):
    spawn(cube, x, y, z, yaw, sx, sy, sz, "PB_Edif_%03d" % i)

print("Puerto Banus creado: %d edificios. El centro (0,0) es la darsena (el agua)." % len(BOXES))
`;

writeFileSync("ue5/import_puertobanus.py", py);
console.log("Escrito ue5/import_puertobanus.py con", boxes.length, "edificios.");
let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
for (const [X, Y] of boxes) { mnx = Math.min(mnx, X); mxx = Math.max(mxx, X); mny = Math.min(mny, Y); mxy = Math.max(mxy, Y); }
console.log("Extension UE (m):", Math.round((mxx - mnx) / 100), "x", Math.round((mxy - mny) / 100));
console.log("Tamano del .py:", (py.length / 1024).toFixed(1), "KB");
