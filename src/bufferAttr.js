export var bufferAttr_copyVector3sArray = (array, vectors) => {
  let offset = 0;

  vectors.map((vector) => {
    array[offset++] = vector.x;
    array[offset++] = vector.y;
    array[offset++] = vector.z;
  });

  return array;
};
