import { redirect } from '@sveltejs/kit'

// Railways moved into the Settings grid (issue #344). Keep the old top-nav URL
// working by redirecting any bookmark or deep link to its dedicated settings page.
export function load() {
  redirect(308, '/settings/railways')
}
