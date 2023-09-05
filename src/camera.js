import {mat4_create, mat4_invert, mat4_lookAt} from './mat4.js';
import {object3d_create, object3d_updateWorldMatrix} from './object3d.js';
import {quat_setFromRotationMatrix} from './quat.js';
import {vec3_clone, vec3_Y} from './vec3.js';

const DEG_TO_RAD = Math.PI / 180;

const _m1 = mat4_create();

export var camera_create = (fov = 60, aspect = 1, near = 0.1, far = 2000) => {
  const camera = {
    ...object3d_create(),
    fov,
    near,
    far,
    aspect,
    up: vec3_clone(vec3_Y),
    matrixWorldInverse: mat4_create(),
    projectionMatrix: mat4_create(),
  };

  camera_updateProjectionMatrix(camera);

  return camera;
};

export var camera_lookAt = (camera, vector) => {
  quat_setFromRotationMatrix(
      camera.quaternion,
      mat4_lookAt(_m1, camera.position, vector, camera.up),
  );
};

export var camera_updateProjectionMatrix = (camera) => {
  const {near, far} = camera;

  const top = near * Math.tan(DEG_TO_RAD * 0.5 * camera.fov);
  const bottom = -top;
  const left = bottom * camera.aspect;
  const right = top * camera.aspect;

  const x = (2 * near) / (right - left);
  const y = (2 * near) / (top - bottom);

  const a = (right + left) / (right - left);
  const b = (top + bottom) / (top - bottom);
  const c = -(far + near) / (far - near);
  const d = (-2 * far * near) / (far - near);

  // prettier-ignore
  camera.projectionMatrix.set([
    x, 0, 0, 0,
    0, y, 0, 0,
    a, b, c, -1,
    0, 0, d, 0,
  ]);
};

export var camera_updateWorldMatrix = (camera) => {
  object3d_updateWorldMatrix(camera);
  camera.matrixWorldInverse.set(camera.matrixWorld);
  mat4_invert(camera.matrixWorldInverse);
};
