import { emptyMyRv, isMyRvSet, rvTypeLabel } from './my-rv.util';

describe('my-rv.util', () => {
  it('emptyMyRv returns all-null state', () => {
    expect(emptyMyRv()).toEqual({ type: null, length: null, height: null, width: null });
  });

  it('isMyRvSet is false for empty', () => {
    expect(isMyRvSet(emptyMyRv())).toBe(false);
  });

  it('isMyRvSet is true when type is set', () => {
    expect(isMyRvSet({ ...emptyMyRv(), type: 'class-a' })).toBe(true);
  });

  it('rvTypeLabel returns "RV" for null and a label for a known id', () => {
    expect(rvTypeLabel(null)).toBe('RV');
    expect(rvTypeLabel('class-a')).toBe('Class A');
  });
});
