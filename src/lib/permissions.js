/**
 * Permissions — rollbaserad behörighet för Lager AI
 * Mappar roller till synlighet och åtgärder
 */

// Synlighetsmatris per flik
// true = synlig, false = dold
const TAB_VISIBILITY = {
  admin:           { overview: true, konstruktion: true, produktion: true, lager: true, montering: true, leverans: true },
  projektledare:   { overview: true, konstruktion: true, produktion: true, lager: true, montering: true, leverans: true },
  konstruktor:     { overview: true, konstruktion: true, produktion: false, lager: false, montering: false, leverans: false },
  produktion:      { overview: true, konstruktion: false, produktion: true, lager: false, montering: false, leverans: false },
  lager:           { overview: true, konstruktion: false, produktion: false, lager: true, montering: false, leverans: false },
  tekniker:        { overview: true, konstruktion: false, produktion: false, lager: false, montering: true, leverans: false },
  saljare:         { overview: true, konstruktion: true, produktion: true, lager: true, montering: true, leverans: true },
  lasare:          { overview: true, konstruktion: false, produktion: false, lager: false, montering: false, leverans: false },
};

// Redigeringsbehörighet per flik
const TAB_EDIT_PERMISSIONS = {
  admin:           { overview: false, konstruktion: true, produktion: true, lager: true, montering: true, leverans: true },
  projektledare:   { overview: false, konstruktion: true, produktion: true, lager: true, montering: true, leverans: true },
  konstruktor:     { overview: false, konstruktion: true, produktion: false, lager: false, montering: false, leverans: false },
  produktion:      { overview: false, konstruktion: false, produktion: true, lager: false, montering: false, leverans: false },
  lager:           { overview: false, konstruktion: false, produktion: false, lager: true, montering: false, leverans: false },
  tekniker:        { overview: false, konstruktion: false, produktion: false, lager: false, montering: true, leverans: false },
  saljare:         { overview: false, konstruktion: false, produktion: false, lager: false, montering: false, leverans: false },
  lasare:          { overview: false, konstruktion: false, produktion: false, lager: false, montering: false, leverans: false },
};

// Åtgärdsbehörigheter
const ACTION_PERMISSIONS = {
  canTransitionPhase: ['admin', 'projektledare'],
  canSendBack:        ['admin', 'projektledare'],
  canPause:           ['admin', 'projektledare'],
  canCancel:          ['admin', 'projektledare'],
  canCloseOrder:      ['admin', 'projektledare'],
  canChangeDeadline:  ['admin', 'projektledare'],
  canAssignRole:      ['admin', 'projektledare'],
  canUploadFile:      ['admin', 'projektledare', 'konstruktor', 'produktion', 'lager', 'tekniker'],
  canPostComment:     ['admin', 'projektledare', 'konstruktor', 'produktion', 'lager', 'tekniker', 'saljare'],
};

/**
 * Hämta alla roller en användare har (inkl. secondary)
 */
function getUserRoles(user) {
  if (!user) return [];
  if (user.systemRoles && Array.isArray(user.systemRoles)) return user.systemRoles;
  return [user.role].filter(Boolean);
}

/**
 * Kolla om användaren har minst en av de angivna rollerna
 */
function hasAnyRole(user, ...roles) {
  const userRoles = getUserRoles(user);
  return userRoles.some((r) => roles.includes(r));
}

/**
 * Kan användaren se en specifik flik?
 */
export function canViewTab(user, tabKey) {
  const roles = getUserRoles(user);
  for (const role of roles) {
    const map = TAB_VISIBILITY[role];
    if (map && map[tabKey] === true) return true;
  }
  return false;
}

/**
 * Kan användaren redigera innehåll i en specifik flik?
 */
export function canEditTab(user, tabKey) {
  const roles = getUserRoles(user);
  for (const role of roles) {
    const map = TAB_EDIT_PERMISSIONS[role];
    if (map && map[tabKey] === true) return true;
  }
  return false;
}

/**
 * Kan användaren utföra en specifik åtgärd?
 */
export function canPerformAction(user, actionKey) {
  const allowed = ACTION_PERMISSIONS[actionKey];
  if (!allowed) return false;
  return hasAnyRole(user, ...allowed);
}

/**
 * Filtrera en lista av flikar baserat på användarens roller
 */
export function filterVisibleTabs(user, tabs) {
  return tabs.filter((tab) => canViewTab(user, tab.key));
}

/**
 * Ska ProcessBoard defaulta till "Mina ordrar"?
 * Begränsade roller (Lager, Tekniker) ser bara sina egna.
 */
export function shouldDefaultToMyOrders(user) {
  return hasAnyRole(user, 'lager', 'tekniker', 'produktion', 'konstruktor');
}

/**
 * Är användaren en "begränsad" roll (ser bara vissa flikar)?
 */
export function isRestrictedRole(user) {
  return hasAnyRole(user, 'lager', 'tekniker');
}

/**
 * Är användaren admin eller projektledare?
 */
export function isAdminOrManager(user) {
  return hasAnyRole(user, 'admin', 'projektledare');
}
