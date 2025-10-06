// This script is injected into the LinkedIn page to extract profile data.
function getProfileData() {
  const data = {
    profession: 'Professional',
    about: ''
  };

  const selectorsProfession = [
    'div.pv-text-details__left-panel > span[aria-hidden="true"]',
    'div.text-body-medium.break-words',
    'h2.top-card-layout__headline',
    '[class*="top-card-layout__headline"]'
  ];

  for (const selector of selectorsProfession) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      data.profession = el.textContent.trim();
      break;
    }
  }

  const selectorsAbout = [
    'section#about div.display-flex span[aria-hidden="true"]',
    'section#about div span[aria-hidden="true"]',
    'section[data-section="summary"] div.display-flex span[aria-hidden="true"]'
  ];

  for (const selector of selectorsAbout) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      data.about = el.textContent.trim().substring(0, 500);
      break;
    }
  }
  
  return data;
}

getProfileData();
