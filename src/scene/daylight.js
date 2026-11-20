import * as THREE from 'three';

// --- daylight through the shipping gate -------------------------------------
// The gate's opening, sent down into the hall along a low evening sun: a
// long patch of daylight across the loading platform, the belt and the
// floor in front of the dock, fading as it comes in. The gap the light comes
// through runs from the sill up to the shutter's bottom edge, so the patch
// reaches further in, and brightens, as the shutter rolls up at Contact.
//
// It isn't one of three's lights. Each of those costs every lit pixel on the
// screen, wherever it is (STATION_LIGHTS in Scene.jsx). This is worked out
// in the shaders of the dock's own batches (StaticBatch `extend`, batch.jsx)
// and of the floor: a point on a surface follows the sunlight back to the
// gate's plane, and if that ray came in through the gap, the point is lit as
// three lights it from a directional light. Nothing in it casts a shadow.
//
// The surfaces here are dark, near black, and lit as they are, sunlight on
// them barely showed. Real sunlight is many times brighter than the light
// indoors, which is why a sunlit patch on a factory floor looks washed out
// whatever the floor's colour. So a share of the light (`dayLift`) comes
// back off every surface it falls on, whatever its colour.
//
// In world space. The dock never moves (it doesn't float, see Stations), and
// ShippingDock sets the gap and the strength every frame.

// how far the light comes in (along the ray, from the gate's plane) before
// the haze starts to take it, and where it's gone
const FADE = [3.5, 11];

export const SUNLIT = {
  key: 'sunlit',
  uniforms: {
    // the gap: half its width, its bottom and top (y), and the gate's plane (z)
    dayGap: { value: new THREE.Vector4() },
    // the way the light travels: into the hall (+z), down at about 15°, and
    // a touch to the left
    dayDir: { value: new THREE.Vector3(-0.05, -0.26, 0.96).normalize() },
    // its colour times its strength
    dayColor: { value: new THREE.Color() },
    // the share of it every surface sends back, whatever its colour
    dayLift: { value: 0.08 },
  },
  patch(shader) {
    Object.assign(shader.uniforms, SUNLIT.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDayWorld;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvDayWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vDayWorld;
uniform vec4 dayGap;
uniform vec3 dayDir;
uniform vec3 dayColor;
uniform float dayLift;
// 1 where the sunlight reaching p came in through the gap, 0 where it didn't,
// with an edge that softens the further the light has come, and fading out
// with the haze
float dayIn(vec3 p) {
  float t = (p.z - dayGap.w) / dayDir.z;
  if (t <= 0.0) return 0.0;
  vec2 q = p.xy - dayDir.xy * t;
  float soft = 0.04 + 0.03 * t;
  float across = 1.0 - smoothstep(dayGap.x - soft, dayGap.x + soft, abs(q.x));
  float up = smoothstep(dayGap.y - soft, dayGap.y + soft, q.y) * (1.0 - smoothstep(dayGap.z - soft, dayGap.z + soft, q.y));
  return across * up * (1.0 - smoothstep(${FADE[0].toFixed(2)}, ${FADE[1].toFixed(2)}, t));
}`,
      )
      .replace(
        '#include <lights_fragment_begin>',
        `#include <lights_fragment_begin>
{
  float day = dayIn(vDayWorld);
  if (day > 0.0) {
    IncidentLight sun;
    sun.direction = normalize((viewMatrix * vec4(-dayDir, 0.0)).xyz);
    sun.color = dayColor * day;
    sun.visible = true;
    RE_Direct(sun, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
    totalEmissiveRadiance += sun.color * dayLift * saturate(dot(geometryNormal, sun.direction));
  }
}`,
      );
  },
};
