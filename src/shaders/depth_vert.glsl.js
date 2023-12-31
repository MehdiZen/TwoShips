export default `
#version 300 es

precision highp float;
precision highp int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;

out vec2 vHighPrecisionZW;

void main() {
  gl_Position =
    projectionMatrix *
    // mvPosition
    modelViewMatrix * vec4(position, 1);
  vHighPrecisionZW = gl_Position.zw;
}
`.trim();
