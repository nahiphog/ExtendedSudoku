(() => {
  const storageKey = 'extended-sudoku-grid-format';
  let remembered = 'v1';
  const normalize = (value) => value === 'v2' ? 'v2' : 'v1';
  const get = () => {
    try { remembered = normalize(localStorage.getItem(storageKey)); } catch { /* storage can be disabled */ }
    return remembered;
  };
  const set = (version) => {
    const normalized = normalize(version);
    remembered = normalized;
    try { localStorage.setItem(storageKey, normalized); } catch { /* use this page session only */ }
    return normalized;
  };
  window.ExtendedSudokuGridFormat = { get, set, label: (version = get()) => version === 'v2' ? 'Version 2' : 'Version 1' };
})();
