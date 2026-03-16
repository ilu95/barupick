// @ts-nocheck
// ================================================================
// profile.ts — 로컬 프로필 관리 유틸 (localStorage 기반)
// 원본: 바루픽_최신본.html 6405~6444행
// ================================================================

import { PERSONAL_COLOR_12 } from './personalColor'
import { BODY_GUIDE_DATA } from './bodyType'
import i18n from '@/i18n'

export const profile = {
    get() {
        try {
            return JSON.parse(localStorage.getItem('cs_profile')) || {};
        } catch (e) { return {}; }
    },
    set(data) {
        const current = this.get();
        localStorage.setItem('cs_profile', JSON.stringify({ ...current, ...data }));
    },
    getPersonalColor() { return this.get().personalColor || null; },
    getBodyEffect() { return this.get().bodyEffect || null; },
    setPersonalColor(type) { this.set({ personalColor: type }); if (type) this.set({ fitMode: true }); },
    setBodyEffect(effect) { this.set({ bodyEffect: effect }); },
    clear() { localStorage.removeItem('cs_profile'); },
    getBodyType() { return this.get().bodyType || null; },
    setBodyType(type) { this.set({ bodyType: type }); if (type) this.set({ fitMode: true }); },
    getGender() { return this.get().gender || null; },
    setGender(g) { this.set({ gender: g }); },
    hasProfile() { return !!(this.getPersonalColor() || this.getBodyEffect() || this.getBodyType()); },
    getFitMode() { return this.get().fitMode === true; },
    setFitMode(v) { this.set({ fitMode: !!v }); },
    hasFitSettings() { return !!(this.getPersonalColor() || this.getBodyType()); },
    getFitLabel() {
        const pc = this.getPersonalColor();
        const bt = this.getBodyType();
        if (pc && bt) return i18n.t('profile.fitLabel.pcAndBody');
        if (pc) return i18n.t('profile.fitLabel.pcOnly');
        if (bt) return i18n.t('profile.fitLabel.bodyOnly');
        return i18n.t('profile.fitLabel.setup');
    },
    getFitSummary() {
        const parts = [];
        const pc = this.getPersonalColor();
        const bt = this.getBodyType();
        if (pc && PERSONAL_COLOR_12[pc]) parts.push(PERSONAL_COLOR_12[pc].name);
        if (bt && BODY_GUIDE_DATA[bt]) parts.push(BODY_GUIDE_DATA[bt].name);
        return parts.join(' · ');
    }
};
