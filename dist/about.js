(() => {
  const aboutButton = document.createElement('button');
  aboutButton.id = 'about-button';
  aboutButton.type = 'button';
  aboutButton.textContent = 'About';
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
  (siteTitle ?? document.body).append(aboutButton);
  document.body.append(dialog);
})();
