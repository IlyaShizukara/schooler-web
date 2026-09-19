// Строит 3D-координаты вершин правильной пирамиды/призмы по параметрам,
// извлечённым бэкендом (см. ai_geometry.py::GeometryExtraction). Вся
// математика детерминированная — здесь нет ИИ и не может быть "почти
// правильного" результата: либо валидные координаты, либо null.

export interface GeometryPoint {
  label: string;
  type: "edge_midpoint" | "base_center";
  of?: string[] | null;
}

export interface GeometryExtraction {
  solid: "pyramid" | "prism";
  base_shape: "equilateral_triangle" | "square" | "regular_hexagon";
  base_labels: string[];
  apex_label?: string | null;
  top_labels?: string[] | null;
  base_edge: number;
  lateral_edge?: number | null;
  height?: number | null;
  extra_points: GeometryPoint[];
  confidence: number;
}

export type Vec3 = [number, number, number];

export interface SolidGeometry {
  vertices: Record<string, Vec3>;
  baseEdges: [string, string][];
  lateralEdges: [string, string][];
  topEdges: [string, string][];
}

const BASE_SHAPE_SIDES: Record<GeometryExtraction["base_shape"], number> = {
  equilateral_triangle: 3,
  square: 4,
  regular_hexagon: 6,
};

/** Возвращает null, если параметры геометрически некорректны (например,
 * боковое ребро короче радиуса описанной окружности основания — такая
 * пирамида физически не существует) — вызывающий код должен в этом
 * случае просто не показывать модель, а не пытаться дорисовать что-то
 * приблизительное. */
export function buildSolidGeometry(g: GeometryExtraction): SolidGeometry | null {
  const n = BASE_SHAPE_SIDES[g.base_shape];
  if (!n || g.base_labels.length !== n) return null;

  const s = g.base_edge;
  if (!(s > 0)) return null;
  // Радиус описанной окружности правильного n-угольника со стороной s.
  const R = s / (2 * Math.sin(Math.PI / n));

  const vertices: Record<string, Vec3> = {};
  const angleOffset = -Math.PI / 2; // первая вершина "сверху" — просто для красоты ракурса
  for (let i = 0; i < n; i++) {
    const theta = angleOffset + (2 * Math.PI * i) / n;
    // Three.js: Y — вертикальная ось, основание лежит в плоскости Y=0.
    vertices[g.base_labels[i]] = [R * Math.cos(theta), 0, R * Math.sin(theta)];
  }

  const baseEdges: [string, string][] = g.base_labels.map((v, i) => [v, g.base_labels[(i + 1) % n]]);
  const lateralEdges: [string, string][] = [];
  const topEdges: [string, string][] = [];

  if (g.solid === "pyramid") {
    if (!g.apex_label) return null;

    let height = g.height ?? null;
    if (height === null && g.lateral_edge != null) {
      // Теорема Пифагора: боковое ребро — гипотенуза треугольника (высота,
      // радиус описанной окружности основания).
      const underRoot = g.lateral_edge * g.lateral_edge - R * R;
      if (underRoot <= 0) return null; // боковое ребро короче/равно радиусу — не существует
      height = Math.sqrt(underRoot);
    }
    if (height === null || !(height > 0)) return null;

    vertices[g.apex_label] = [0, height, 0];
    lateralEdges.push(...g.base_labels.map((v): [string, string] => [v, g.apex_label as string]));
  } else {
    if (!g.top_labels || g.top_labels.length !== n) return null;
    if (!g.height || !(g.height > 0)) return null;

    for (let i = 0; i < n; i++) {
      const [x, , z] = vertices[g.base_labels[i]];
      vertices[g.top_labels[i]] = [x, g.height, z];
    }
    lateralEdges.push(...g.base_labels.map((v, i): [string, string] => [v, (g.top_labels as string[])[i]]));
    topEdges.push(
      ...g.top_labels.map((v, i): [string, string] => [v, (g.top_labels as string[])[(i + 1) % n]])
    );
  }

  // extra_points считаются последними — им нужны уже готовые координаты
  // базовых вершин/апекса/верхнего основания.
  for (const p of g.extra_points) {
    if (p.type === "base_center") {
      vertices[p.label] = [0, 0, 0];
    } else if (p.type === "edge_midpoint" && p.of && p.of.length === 2) {
      const [a, b] = p.of;
      const va = vertices[a];
      const vb = vertices[b];
      if (va && vb) {
        vertices[p.label] = [(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2];
      }
    }
  }

  return { vertices, baseEdges, lateralEdges, topEdges };
}