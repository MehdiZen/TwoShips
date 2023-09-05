export var interval_create = (duration) => {
  let previousTime = 0;
  let time = duration;

  return (dt, condition = true) => {
    time += dt;

    if (time - previousTime > duration) {
      if (condition) previousTime = time;
      return condition;
    }
  };
};
