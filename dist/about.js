(() => {
  const formatControl = document.createElement('div');
  formatControl.className = 'grid-format-toggle';
  formatControl.setAttribute('aria-label', 'Grid version');
  const formatLabel = document.createElement('span');
  formatLabel.textContent = 'Grid version';
  formatControl.append(formatLabel);
  const formatButtons = ['v1', 'v2'].map((version) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = version === 'v1' ? '1' : '2';
    button.title = version === 'v1' ? 'Use grid version 1' : 'Use grid version 2';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(window.ExtendedSudokuGridFormat.get() === version));
    button.addEventListener('click', () => {
      window.ExtendedSudokuGridFormat.set(version);
      window.location.reload();
    });
    formatControl.append(button);
    return button;
  });
  const aboutButton = document.createElement('button');
  aboutButton.id = 'about-button';
  aboutButton.className = 'about-button';
  aboutButton.type = 'button';
  aboutButton.textContent = 'About';
  Object.assign(aboutButton.style, {
    position: 'fixed', top: '8px', right: '16px', left: 'auto', transform: 'none', zIndex: '20', pointerEvents: 'auto',
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
  document.title = document.title.replace(/Extended Sudoku/g, 'Expanded Sudoku');
  if (siteTitle) {
    Array.from(siteTitle.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => {
      node.textContent = node.textContent.replace('Extended Sudoku Maker', 'Expanded Sudoku Maker');
    });
  }
  if (siteTitle && siteNav) siteTitle.prepend(siteNav);
  (siteTitle ?? document.body).append(formatControl, aboutButton);
  document.body.append(dialog);
})();
