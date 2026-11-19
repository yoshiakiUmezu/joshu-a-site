// Mock transports inspect the request but never decode or send this test image.
export function fixturePlan(art = null, notes = 'fixture') {
  return { notes, reference: 'data:image/jpeg;base64,/9j/VEVTVA==',
    art, placement: 'wide', position: '50% 50%' };
}
