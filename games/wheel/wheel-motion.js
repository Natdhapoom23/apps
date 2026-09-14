// Pointer is at 90 degrees clockwise from twelve o'clock.
export function landingAngle(current, index, count, turns = 5) {
  const center = (index + .5) * 360 / count;
  const target = ((90 - center) % 360 + 360) % 360;
  const normalized = ((current % 360) + 360) % 360;
  return current + turns * 360 + ((target - normalized + 360) % 360);
}
// Velocity decreases continuously to zero, with no snap or reverse at the end.
export const coastProgress = progress => 1 - (1 - progress) ** 4;
