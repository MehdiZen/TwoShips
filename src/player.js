import {playJump} from './audio.js';
import {
  box3_copy,
  box3_create,
  box3_overlapsBox,
  box3_translate,
  box3_union,
} from './box3.js';
import {BODY_BULLET, physics_bodies, sweptAABB} from './physics.js';
import {
  OVERCLIP,
  pm_clipVelocity,
  vec3_add,
  vec3_addScaledVector,
  vec3_clone,
  vec3_create,
  vec3_crossVectors,
  vec3_dot,
  vec3_length,
  vec3_lerpVectors,
  vec3_multiplyScalar,
  vec3_normalize,
  vec3_setScalar,
  vec3_subVectors,
  vec3_Y,
} from './vec3.js';

// bg_local.h
const JUMP_VELOCITY = 270;

// movement parameters
const pm_stopspeed = 100;

const pm_accelerate = 10;
const pm_airaccelerate = 1;

const pm_friction = 6;

const g_speed = 320;
const g_gravity = 800;

const player_groundTrace_normal = vec3_clone(vec3_Y);

export var player_create = (object, body) => ({
  object,
  body,

  scene: undefined,

  // player input
  command: vec3_create(),

  // run-time variables
  dt: 0,
  gravity: g_gravity,
  speed: g_speed,
  viewForward: vec3_create(),
  viewRight: vec3_create(),

  // walk movement
  jump: 0,
  walking: false,
});

export var player_update = (player) => {
  if (player.command.y < 10) {
    // not holding jump
    player.jump = false;
  }

  player_checkGround(player);

  if (player.walking) {
    // walking on ground
    player_walkMove(player);
  } else {
    // airborne
    player_airMove(player);
  }

  player_checkGround(player);
};

export var trace_create = () => ({
  allsolid: false,
  fraction: 1,
  endpos: vec3_create(),
  normal: vec3_create(),
});

const trace_copy = (a, b) => {
  a.allsolid = b.allsolid;
  a.fraction = b.fraction;
  Object.assign(a.endpos, b.endpos);
  Object.assign(a.normal, b.normal);
  return a;
};

const trace_reset = (() => {
  const _trace = trace_create();

  return (trace) => {
    trace_copy(trace, _trace);
    return trace;
  };
})();

export var body_trace = (() => {
  const boxA = box3_create();
  const boxB = box3_create();
  const sweptBoxA = box3_create();

  const originalVelocity = vec3_create();
  const velocity = vec3_create();
  const _trace = trace_create();

  return (bodies, bodyA, trace, start, end) => {
    trace_reset(trace);

    Object.assign(originalVelocity, bodyA.velocity);
    Object.assign(bodyA.velocity, vec3_subVectors(velocity, end, start));

    box3_union(
        box3_translate(box3_copy(sweptBoxA, bodyA.boundingBox), end),
        box3_translate(box3_copy(boxA, bodyA.boundingBox), start),
    );

    for (let i = 0; i < bodies.length; i++) {
      const bodyB = bodies[i];
      if (
        !box3_overlapsBox(
            sweptBoxA,
            box3_translate(
                box3_copy(boxB, bodyB.boundingBox),
                bodyB.parent.position,
            ),
        )
      ) {
        continue;
      }

      sweptAABB(trace_reset(_trace), bodyA, bodyB, boxA, boxB);
      if (_trace.fraction < trace.fraction) {
        trace_copy(trace, _trace);
      }
    }

    Object.assign(bodyA.velocity, originalVelocity);
    vec3_lerpVectors(trace.endpos, start, end, trace.fraction);
  };
})();

const player_trace = (player, trace, start, end) => {
  const bodies = physics_bodies(player.scene).filter(
      (body) => body !== player.body && body.physics !== BODY_BULLET,
  );
  body_trace(bodies, player.body, trace, start, end);
};

const MAX_CLIP_PLANES = 5;

const player_slideMove = (() => {
  const dir = vec3_create();
  let numplanes;
  const planes = [...Array(MAX_CLIP_PLANES)].map(() => vec3_create());
  const clipVelocity = vec3_create();
  const trace = trace_create();
  const end = vec3_create();
  const endVelocity = vec3_create();
  const endClipVelocity = vec3_create();

  return (player, gravity) => {
    if (gravity) {
      Object.assign(endVelocity, player.body.velocity);
      endVelocity.y -= player.gravity * player.dt;
      player.body.velocity.y = (player.body.velocity.y + endVelocity.y) * 0.5;
      if (player.walking) {
        // slide along the ground plane
        pm_clipVelocity(
            player.body.velocity,
            player_groundTrace_normal,
            OVERCLIP,
        );
      }
    }

    let time_left = player.dt;

    // never turn against the ground plane
    if (player.walking) {
      numplanes = 1;
      Object.assign(planes[0], player_groundTrace_normal);
    } else {
      numplanes = 0;
    }

    // never turn against original velocity
    vec3_normalize(Object.assign(planes[numplanes], player.body.velocity));
    numplanes++;

    let bumpcount;
    const numbumps = 4;
    for (bumpcount = 0; bumpcount < numbumps; bumpcount++) {
      // calculate position we are trying to move to
      vec3_addScaledVector(
          Object.assign(end, player.object.position),
          player.body.velocity,
          time_left,
      );

      // see if we can make it there
      player_trace(player, trace, player.object.position, end);

      if (trace.allsolid) {
        player.body.velocity.y = 0;
        return true;
      }

      if (trace.fraction > 0) {
        // actually covered some distance
        Object.assign(player.object.position, trace.endpos);
      }

      if (trace.fraction === 1) {
        // moved the entire distance
        break;
      }

      time_left -= time_left * trace.fraction;

      if (numplanes >= MAX_CLIP_PLANES) {
        // this shouldn't really happen
        vec3_setScalar(player.body.velocity, 0);
        return true;
      }

      //
      // if this is the same plane we hit before, nudge velocity
      // out along it, which fixes some epsilon issues with
      // non-axial planes
      //
      for (var i = 0; i < numplanes; i++) {
        if (vec3_dot(trace.normal, planes[i]) > 0.99) {
          vec3_add(player.body.velocity, trace.normal);
          break;
        }
      }
      if (i < numplanes) {
        continue;
      }

      Object.assign(planes[numplanes], trace.normal);
      numplanes++;

      //
      //  modify velocity so that it parallels all of the clip planes
      //

      // find a plane that it enters
      for (i = 0; i < numplanes; i++) {
        const into = vec3_dot(player.body.velocity, planes[i]);
        if (into >= 0.1) {
          // move doesn't interact with the plane
          continue;
        }

        // slide along the plane
        pm_clipVelocity(
            Object.assign(clipVelocity, player.body.velocity),
            planes[i],
            OVERCLIP,
        );

        if (gravity) {
          // slide along the plane
          pm_clipVelocity(
              Object.assign(endClipVelocity, endVelocity),
              planes[i],
              OVERCLIP,
          );
        }

        // see if there is a second plane that the new move enters
        for (let j = 0; j < numplanes; j++) {
          if (j === i) {
            continue;
          }

          if (vec3_dot(clipVelocity, planes[j]) >= 0.1) {
            // move doesn't interact with the plane
            continue;
          }

          // try clipping the move to the plane
          pm_clipVelocity(clipVelocity, planes[j], OVERCLIP);

          if (gravity) {
            pm_clipVelocity(endClipVelocity, planes[j], OVERCLIP);
          }

          // see if it goes back into the first clip plane
          if (vec3_dot(clipVelocity, planes[i]) >= 0) {
            continue;
          }

          // slide the original velocity along the crease
          vec3_multiplyScalar(
              Object.assign(
                  clipVelocity,
                  vec3_normalize(vec3_crossVectors(dir, planes[i], planes[j])),
              ),
              vec3_dot(dir, player.body.velocity),
          );

          if (gravity) {
            vec3_multiplyScalar(
                Object.assign(endClipVelocity, dir),
                vec3_dot(dir, endVelocity),
            );
          }

          // see if there is a third plane that the new move enters
          for (let k = 0; k < numplanes; k++) {
            if (k === i || k === j) {
              continue;
            }

            if (vec3_dot(clipVelocity, planes[k]) >= 0.1) {
              // move doesn't interact with the plane
              continue;
            }

            // stop dead at a triple plane intersection
            vec3_setScalar(player.body.velocity, 0);
            return true;
          }
        }

        // if we have fixed all interactions, try another move
        Object.assign(player.body.velocity, clipVelocity);

        if (gravity) {
          Object.assign(endVelocity, endClipVelocity);
        }

        break;
      }
    }

    if (gravity) {
      Object.assign(player.body.velocity, endVelocity);
    }

    return bumpcount !== 0;
  };
})();

const player_checkJump = (player) => {
  if (player.command.y < 10) {
    // not holding jump
    return false;
  }

  // must wait for jump to be released
  if (player.jump) {
    player.command.y = 0;
    return false;
  }

  player.walking = false;
  player.jump = true;

  player.body.velocity.y = JUMP_VELOCITY;
  playJump();

  return true;
};

var player_walkMove = (() => {
  const wishvel = vec3_create();
  const wishdir = vec3_create();

  return (player) => {
    if (player_checkJump(player)) {
      player_airMove(player);
      return;
    }

    player_friction(player);

    const fmove = player.command.z;
    const smove = player.command.x;

    const scale = player_cmdScale(player);

    // project moves down to flat plane
    player.viewForward.y = 0;
    player.viewRight.y = 0;

    // project the forward and right directions onto the ground plane
    vec3_addScaledVector(
        vec3_addScaledVector(
            vec3_setScalar(wishvel, 0),
            vec3_normalize(
                pm_clipVelocity(
                    player.viewForward,
                    player_groundTrace_normal,
                    OVERCLIP,
                ),
            ),
            fmove,
        ),
        vec3_normalize(
            pm_clipVelocity(player.viewRight, player_groundTrace_normal, OVERCLIP),
        ),
        smove,
    );

    let wishspeed = vec3_length(Object.assign(wishdir, wishvel));
    vec3_normalize(wishdir);
    wishspeed *= scale;

    player_accelerate(player, wishdir, wishspeed, pm_accelerate);

    // slide along the ground plane
    pm_clipVelocity(player.body.velocity, player_groundTrace_normal, OVERCLIP);

    // don't do anything if standing still
    if (!player.body.velocity.x && !player.body.velocity.z) {
      return;
    }

    player_slideMove(player, false);
  };
})();

var player_airMove = (() => {
  const wishvel = vec3_create();
  const wishdir = vec3_create();

  return (player) => {
    player_friction(player);

    const fmove = player.command.z;
    const smove = player.command.x;

    const scale = player_cmdScale(player);

    // project moves down to flat plane
    player.viewForward.y = 0;
    player.viewRight.y = 0;

    vec3_addScaledVector(
        vec3_addScaledVector(
            vec3_setScalar(wishvel, 0),
            vec3_normalize(player.viewForward),
            fmove,
        ),
        vec3_normalize(player.viewRight),
        smove,
    );
    wishvel.y = 0;

    Object.assign(wishdir, wishvel);
    let wishspeed = vec3_length(wishdir);
    vec3_normalize(wishdir);
    wishspeed *= scale;

    // not on ground, so little effect on velocity
    player_accelerate(player, wishdir, wishspeed, pm_airaccelerate);

    // we may have a ground plane that is very steep, even
    // though we don't have a groundentity
    // slide along the steep plane
    if (player.walking) {
      pm_clipVelocity(
          player.body.velocity,
          player_groundTrace_normal,
          OVERCLIP,
      );
    }

    player_slideMove(player, true);
  };
})();

var player_friction = (() => {
  const vec = vec3_create();

  return (player) => {
    const vel = player.body.velocity;

    Object.assign(vec, vel);
    if (player.walking) {
      vec.y = 0; // ignore slope movement
    }

    const speed = vec3_length(vec);
    if (speed < 1) {
      vel.x = 0;
      vel.z = 0;
      return;
    }

    let drop = 0;

    // apply ground friction
    if (player.walking) {
      const control = speed < pm_stopspeed ? pm_stopspeed : speed;
      drop += control * pm_friction * player.dt;
    }

    // scale the velocity
    let newspeed = speed - drop;
    if (newspeed < 0) {
      newspeed = 0;
    }
    newspeed /= speed;

    vec3_multiplyScalar(vel, newspeed);
  };
})();

var player_cmdScale = (player) => {
  const max = Math.max(
      Math.abs(player.command.x),
      Math.abs(player.command.y),
      Math.abs(player.command.z),
  );

  if (!max) {
    return 0;
  }

  const total = vec3_length(player.command);
  const scale = (player.speed * max) / (127 * total);

  return scale;
};

var player_accelerate = (player, wishdir, wishspeed, accel) => {
  const currentspeed = vec3_dot(player.body.velocity, wishdir);
  const addspeed = wishspeed - currentspeed;
  if (addspeed <= 0) {
    return;
  }
  let accelspeed = accel * player.dt * wishspeed;
  if (accelspeed > addspeed) {
    accelspeed = addspeed;
  }

  vec3_addScaledVector(player.body.velocity, wishdir, accelspeed);
};

var player_checkGround = (() => {
  const position = vec3_create();
  const trace = trace_create();

  return (player) => {
    Object.assign(position, player.object.position);
    position.y -= 0.25;

    player_trace(player, trace, player.object.position, position);
    // if the trace didn't hit anything, we are in free fall
    if (trace.fraction === 1) {
      player.walking = false;
      return;
    }

    player.walking = true;
  };
})();
