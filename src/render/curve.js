// "Curved world" vertex bend: geometry far ahead drops below the horizon and sways left/right,
// which makes a straight track feel like a winding road. Gameplay stays in straight space.
export const curveUniforms = {
  uCurveY: { value: 0.0006 },
  uCurveX: { value: 0.0 },
};

const BEND = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 cwPos = modelMatrix * mvPosition;
float cwD = max(0.0, -cwPos.z);
cwPos.y -= cwD * cwD * uCurveY;
cwPos.x += cwD * cwD * uCurveX;
mvPosition = viewMatrix * cwPos;
gl_Position = projectionMatrix * mvPosition;
`;

export function curvify(material) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uCurveY = curveUniforms.uCurveY;
    shader.uniforms.uCurveX = curveUniforms.uCurveX;
    shader.vertexShader = 'uniform float uCurveY;\nuniform float uCurveX;\n' +
      shader.vertexShader.replace('#include <project_vertex>', BEND);
  };
  material.customProgramCacheKey = () => 'curved-world';
  return material;
}

/** Same bend on the CPU (for projecting HUD popups / particles onto bent geometry). */
export function bendPoint(v) {
  const d = Math.max(0, -v.z);
  v.y -= d * d * curveUniforms.uCurveY.value;
  v.x += d * d * curveUniforms.uCurveX.value;
  return v;
}
