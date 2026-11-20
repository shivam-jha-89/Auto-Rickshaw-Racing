// Clerk sign-up / login + cloud save (stored in the user's Clerk unsafeMetadata, ~8 KB max).
// If no publishable key is configured the game simply runs in guest mode.
import { save, setPersistHook, replaceSave } from './save.js';

const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
let clerk = null;
let pushTimer = null;

const progress = s => (s?.stats?.distance || 0) + (s?.coins || 0) * 2 + (s?.high || 0) * 0.1;

export const auth = {
  enabled: !!KEY,
  ready: false,
  user: null,

  async init(onChange) {
    if (!KEY) return;
    try {
      // Clerk v6 ships its sign-in / sign-up UI as a separate package; bundle it so the modals work everywhere.
      const [{ Clerk }, { ui }] = await Promise.all([import('@clerk/clerk-js'), import('@clerk/ui')]);
      clerk = new Clerk(KEY);
      await clerk.load({
        ui,
        appearance: {
          variables: { colorPrimary: '#0b8f3a', colorText: '#1b1024', borderRadius: '14px', fontFamily: '"Trebuchet MS", system-ui, sans-serif' },
        },
      });
      this.ready = true;
      let lastId = null;
      const handle = async user => {
        this.user = user || null;
        if (user && user.id !== lastId) { lastId = user.id; await this.pull(); }
        if (!user) lastId = null;
        onChange?.(this.user);
      };
      clerk.addListener(({ user }) => handle(user));
      await handle(clerk.user);
      setPersistHook(() => this.schedulePush());
    } catch (e) {
      console.warn('Clerk failed to load — guest mode', e);
      this.enabled = false;
    }
  },

  get name() {
    const u = this.user;
    return u ? (u.firstName || u.username || u.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Player') : null;
  },

  openSignIn() { clerk?.openSignIn({}); },
  openSignUp() { clerk?.openSignUp({}); },
  openProfile() { clerk?.openUserProfile(); },
  async signOut() { await clerk?.signOut(); },

  /** Merge cloud ↔ local: whichever profile has more progress wins, then both are in sync. */
  async pull() {
    if (!this.user) return;
    const cloud = this.user.unsafeMetadata?.rikshawSave;
    if (cloud && progress(cloud) > progress(save)) replaceSave(cloud);
    await this.push();
  },

  schedulePush() {
    if (!this.user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => this.push(), 2500);
  },

  async push() {
    if (!this.user) return;
    try {
      const { daily, ...rest } = save; // daily challenges stay per-device
      await this.user.update({ unsafeMetadata: { ...this.user.unsafeMetadata, rikshawSave: rest } });
    } catch (e) { console.warn('cloud save failed', e); }
  },
};
