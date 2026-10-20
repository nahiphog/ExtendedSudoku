(() => {
  const gridVersion = document.createElement('select');
  gridVersion.className = 'grid-version-select';
  gridVersion.setAttribute('aria-label', 'Grid version');
  const versionOne = document.createElement('option');
  versionOne.value = '1'; versionOne.textContent = 'Grid version 1';
  const versionTwo = document.createElement('option');
  versionTwo.value = '2'; versionTwo.textContent = 'Grid version 2';
  gridVersion.append(versionOne, versionTwo);
  try { gridVersion.value = localStorage.getItem('extended-sudoku-grid-version') === '2' ? '2' : '1'; }
  catch { gridVersion.value = '1'; }
  gridVersion.addEventListener('change', () => {
    try { localStorage.setItem('extended-sudoku-grid-version', gridVersion.value); location.reload(); }
    catch { gridVersion.value = '1'; alert('Grid version selection requires browser storage.'); }
  });
  const aboutButton = document.createElement('button');
  aboutButton.id = 'about-button';
  aboutButton.className = 'about-button';
  aboutButton.type = 'button';
  aboutButton.textContent = 'About';
  Object.assign(aboutButton.style, {
    position: 'fixed', top: '10px', right: '18px', left: 'auto', transform: 'none', zIndex: '20',
  });
  aboutButton.setAttribute('aria-haspopup', 'dialog');

  const dialog = document.createElement('dialog');
  dialog.className = 'about-dialog';
  dialog.setAttribute('aria-labelledby', 'about-heading');
  const heading = document.createElement('h2');
  heading.id = 'about-heading';
  heading.textContent = 'How to play';
  const description = document.createElement('p');
  description.textContent = 'Fill the grid with the digits 1–9, ensuring that no digit repeats within any of the twelve rows, columns, or 3×3 boxes. Rows and columns continue across the empty spaces.';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.append(heading, description, closeButton);

  aboutButton.addEventListener('click', () => dialog.showModal());
  const siteTitle = document.querySelector('.site-title');
  const siteNav = document.querySelector('.site-nav');
  if (siteTitle && siteNav) siteTitle.prepend(siteNav);
  (siteTitle ?? document.body).append(gridVersion, aboutButton);
  document.body.append(dialog);
})();
