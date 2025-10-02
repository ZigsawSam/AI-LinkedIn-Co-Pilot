// Extract profile data from LinkedIn
function getProfileData() {
  const selectors = {
    professionPrimary: '.pv-text-details__left-panel .text-body-medium',
    professionFallback: '.text-body-medium.break-words',
    aboutPrimary: '#about ~ .display-flex.full-width .pv-shared-text-with-see-more span:first-child',
    aboutAlt: '#about .pv-about__summary-text span'
  };

  const data = {};

  // Profession
  let professionEl = document.querySelector(selectors.professionPrimary);
  if (professionEl && professionEl.textContent) {
    data.profession = professionEl.textContent.trim();
  } else {
    const fb = document.querySelector(selectors.professionFallback);
    data.profession = fb ? fb.textContent.trim() : 'Professional';
  }

  // About section
  let aboutEl = document.querySelector(selectors.aboutPrimary);
  if (aboutEl && aboutEl.textContent) {
    data.about = aboutEl.textContent.trim().substring(0, 400);
  } else {
    const alt = document.querySelector(selectors.aboutAlt);
    data.about = alt && alt.textContent ? alt.textContent.trim().substring(0, 400) : '';
  }

  return data;
}

getProfileData();
