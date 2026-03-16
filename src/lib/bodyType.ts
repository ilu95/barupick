// @ts-nocheck
// ================================================================
// bodyType.ts — 체형 진단 + 체형별 코디 가이드 데이터
// 원본: 바루픽_최신본.html 4757~5129행
// ================================================================

import i18n from '@/i18n'

export const BODY_TYPE_DIAGNOSIS = {
    questions: [
        {
            id: 1,
            get question() { return i18n.t('bodyType:diagnosis.questions.0.question') },
            options: [
                { get text() { return i18n.t('bodyType:diagnosis.questions.0.options.0') }, score: { inverted: 2 } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.0.options.1') }, score: { triangle: 2 } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.0.options.2') }, score: { rectangle: 1, hourglass: 1 } }
            ]
        },
        {
            id: 2,
            get question() { return i18n.t('bodyType:diagnosis.questions.1.question') },
            options: [
                { get text() { return i18n.t('bodyType:diagnosis.questions.1.options.0') }, score: { hourglass: 2 } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.1.options.1') }, score: { rectangle: 2 } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.1.options.2') }, score: { round: 2 } }
            ]
        },
        {
            id: 3,
            get question() { return i18n.t('bodyType:diagnosis.questions.2.question') },
            options: [
                { get text() { return i18n.t('bodyType:diagnosis.questions.2.options.0') }, score: { effect: 'shoulder-wide' } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.2.options.1') }, score: { effect: 'shoulder-narrow' } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.2.options.2') }, score: { effect: 'belly' } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.2.options.3') }, score: { effect: 'legs-long' } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.2.options.4') }, score: { effect: 'height-tall' } },
                { get text() { return i18n.t('bodyType:diagnosis.questions.2.options.5') }, score: { effect: 'none' } }
            ]
        }
    ],
    effects: {
        'shoulder-wide': {
            get name() { return i18n.t('bodyType:diagnosis.effects.shoulder-wide.name') },
            emoji: '💪',
            get description() { return i18n.t('bodyType:diagnosis.effects.shoulder-wide.description') },
            rules: { top: 'light', bottom: 'dark' }
        },
        'shoulder-narrow': {
            get name() { return i18n.t('bodyType:diagnosis.effects.shoulder-narrow.name') },
            emoji: '🎨',
            get description() { return i18n.t('bodyType:diagnosis.effects.shoulder-narrow.description') },
            rules: { top: 'dark', bottom: 'light' }
        },
        'belly': {
            get name() { return i18n.t('bodyType:diagnosis.effects.belly.name') },
            emoji: '🎯',
            get description() { return i18n.t('bodyType:diagnosis.effects.belly.description') },
            rules: { top: 'dark', middleware: 'dark' }
        },
        'legs-long': {
            get name() { return i18n.t('bodyType:diagnosis.effects.legs-long.name') },
            emoji: '👖',
            get description() { return i18n.t('bodyType:diagnosis.effects.legs-long.description') },
            rules: { bottom: 'match-shoes', shoes: 'match-bottom' }
        },
        'height-tall': {
            get name() { return i18n.t('bodyType:diagnosis.effects.height-tall.name') },
            emoji: '📏',
            get description() { return i18n.t('bodyType:diagnosis.effects.height-tall.description') },
            rules: { all: 'monochrome' }
        },
        'none': {
            get name() { return i18n.t('bodyType:diagnosis.effects.none.name') },
            emoji: '✨',
            get description() { return i18n.t('bodyType:diagnosis.effects.none.description') },
            rules: {}
        }
    }
};

// ============================================================
// 체형별 코디 가이드 — 5가지 체형 × 2성별 + 상세 가이드
// ============================================================
export const BODY_GUIDE_DATA = {
    inverted: {
        get name() { return i18n.t('bodyType:guide.inverted.name') }, emoji: '🔻', icon: '💪',
        get subtitle() { return i18n.t('bodyType:guide.inverted.subtitle') },
        silhouette: { shoulder: 'wide', waist: 'medium', hip: 'narrow' },
        colorRules: { outer: 'dark', top: 'dark', bottom: 'light', shoes: 'any', get summary() { return i18n.t('bodyType:guide.inverted.colorSummary') } },
        bodyEffect: 'shoulder-narrow',
        female: {
            get desc() { return i18n.t('bodyType:guide.inverted.female.desc') },
            get doList() { return Array.from({ length: 7 }, (_, i) => i18n.t(`bodyType:guide.inverted.female.doList.${i}`)) },
            get dontList() { return Array.from({ length: 5 }, (_, i) => i18n.t(`bodyType:guide.inverted.female.dontList.${i}`)) },
        },
        male: {
            get desc() { return i18n.t('bodyType:guide.inverted.male.desc') },
            get doList() { return Array.from({ length: 7 }, (_, i) => i18n.t(`bodyType:guide.inverted.male.doList.${i}`)) },
            get dontList() { return Array.from({ length: 6 }, (_, i) => i18n.t(`bodyType:guide.inverted.male.dontList.${i}`)) },
        }
    },
    triangle: {
        get name() { return i18n.t('bodyType:guide.triangle.name') }, emoji: '🔺', icon: '🍐',
        get subtitle() { return i18n.t('bodyType:guide.triangle.subtitle') },
        silhouette: { shoulder: 'narrow', waist: 'medium', hip: 'wide' },
        colorRules: { outer: 'light', top: 'light', bottom: 'dark', shoes: 'dark', get summary() { return i18n.t('bodyType:guide.triangle.colorSummary') } },
        bodyEffect: 'shoulder-wide',
        female: {
            get desc() { return i18n.t('bodyType:guide.triangle.female.desc') },
            get doList() { return Array.from({ length: 7 }, (_, i) => i18n.t(`bodyType:guide.triangle.female.doList.${i}`)) },
            get dontList() { return Array.from({ length: 5 }, (_, i) => i18n.t(`bodyType:guide.triangle.female.dontList.${i}`)) },
        },
        male: {
            get desc() { return i18n.t('bodyType:guide.triangle.male.desc') },
            get doList() { return Array.from({ length: 7 }, (_, i) => i18n.t(`bodyType:guide.triangle.male.doList.${i}`)) },
            get dontList() { return Array.from({ length: 5 }, (_, i) => i18n.t(`bodyType:guide.triangle.male.dontList.${i}`)) },
        }
    },
    rectangle: {
        get name() { return i18n.t('bodyType:guide.rectangle.name') }, emoji: '▬', icon: '📐',
        get subtitle() { return i18n.t('bodyType:guide.rectangle.subtitle') },
        silhouette: { shoulder: 'medium', waist: 'medium', hip: 'medium' },
        colorRules: { outer: 'any', top: 'light', bottom: 'dark', shoes: 'match-bottom', get summary() { return i18n.t('bodyType:guide.rectangle.colorSummary') } },
        bodyEffect: 'none',
        female: {
            get desc() { return i18n.t('bodyType:guide.rectangle.female.desc') },
            get doList() { return Array.from({ length: 8 }, (_, i) => i18n.t(`bodyType:guide.rectangle.female.doList.${i}`)) },
            get dontList() { return Array.from({ length: 5 }, (_, i) => i18n.t(`bodyType:guide.rectangle.female.dontList.${i}`)) },
        },
        male: {
            get desc() { return i18n.t('bodyType:guide.rectangle.male.desc') },
            get doList() { return Array.from({ length: 7 }, (_, i) => i18n.t(`bodyType:guide.rectangle.male.doList.${i}`)) },
            get dontList() { return Array.from({ length: 6 }, (_, i) => i18n.t(`bodyType:guide.rectangle.male.dontList.${i}`)) },
        }
    },
    hourglass: {
        get name() { return i18n.t('bodyType:guide.hourglass.name') }, emoji: '⏳', icon: '✨',
        get subtitle() { return i18n.t('bodyType:guide.hourglass.subtitle') },
        silhouette: { shoulder: 'medium', waist: 'narrow', hip: 'medium' },
        colorRules: { outer: 'any', top: 'any', bottom: 'any', shoes: 'any', get summary() { return i18n.t('bodyType:guide.hourglass.colorSummary') } },
        bodyEffect: 'none',
        female: {
            get desc() { return i18n.t('bodyType:guide.hourglass.female.desc') },
            get doList() { return Array.from({ length: 7 }, (_, i) => i18n.t(`bodyType:guide.hourglass.female.doList.${i}`)) },
            get dontList() { return Array.from({ length: 6 }, (_, i) => i18n.t(`bodyType:guide.hourglass.female.dontList.${i}`)) },
        },
        male: {
            get desc() { return i18n.t('bodyType:guide.hourglass.male.desc') },
            get doList() { return Array.from({ length: 8 }, (_, i) => i18n.t(`bodyType:guide.hourglass.male.doList.${i}`)) },
            get dontList() { return Array.from({ length: 5 }, (_, i) => i18n.t(`bodyType:guide.hourglass.male.dontList.${i}`)) },
        }
    },
    round: {
        get name() { return i18n.t('bodyType:guide.round.name') }, emoji: '⭕', icon: '🎯',
        get subtitle() { return i18n.t('bodyType:guide.round.subtitle') },
        silhouette: { shoulder: 'medium', waist: 'wide', hip: 'medium' },
        colorRules: { outer: 'dark', top: 'dark', middleware: 'dark', bottom: 'dark', shoes: 'match-bottom', get summary() { return i18n.t('bodyType:guide.round.colorSummary') } },
        bodyEffect: 'belly',
        female: {
            get desc() { return i18n.t('bodyType:guide.round.female.desc') },
            get doList() { return Array.from({ length: 9 }, (_, i) => i18n.t(`bodyType:guide.round.female.doList.${i}`)) },
            get dontList() { return Array.from({ length: 6 }, (_, i) => i18n.t(`bodyType:guide.round.female.dontList.${i}`)) },
        },
        male: {
            get desc() { return i18n.t('bodyType:guide.round.male.desc') },
            get doList() { return Array.from({ length: 7 }, (_, i) => i18n.t(`bodyType:guide.round.male.doList.${i}`)) },
            get dontList() { return Array.from({ length: 8 }, (_, i) => i18n.t(`bodyType:guide.round.male.dontList.${i}`)) },
        }
    }
};

// 체형 진단 퀴즈 (5문항)
export const BODY_QUIZ_QUESTIONS = [
    {
        get question() { return i18n.t('bodyType:quiz.questions.0.question') },
        options: [
            { get text() { return i18n.t('bodyType:quiz.questions.0.options.0') }, scores: { inverted: 3 } },
            { get text() { return i18n.t('bodyType:quiz.questions.0.options.1') }, scores: { triangle: 3 } },
            { get text() { return i18n.t('bodyType:quiz.questions.0.options.2') }, scores: { rectangle: 1, hourglass: 1 } }
        ]
    },
    {
        get question() { return i18n.t('bodyType:quiz.questions.1.question') },
        options: [
            { get text() { return i18n.t('bodyType:quiz.questions.1.options.0') }, scores: { hourglass: 3 } },
            { get text() { return i18n.t('bodyType:quiz.questions.1.options.1') }, scores: { rectangle: 3 } },
            { get text() { return i18n.t('bodyType:quiz.questions.1.options.2') }, scores: { round: 3 } }
        ]
    },
    {
        get question() { return i18n.t('bodyType:quiz.questions.2.question') },
        options: [
            { get text() { return i18n.t('bodyType:quiz.questions.2.options.0') }, scores: { inverted: 2, round: 1 } },
            { get text() { return i18n.t('bodyType:quiz.questions.2.options.1') }, scores: { triangle: 2, hourglass: 1 } },
            { get text() { return i18n.t('bodyType:quiz.questions.2.options.2') }, scores: { rectangle: 2 } }
        ]
    },
    {
        get question() { return i18n.t('bodyType:quiz.questions.3.question') },
        options: [
            { get text() { return i18n.t('bodyType:quiz.questions.3.options.0') }, scores: { inverted: 2 } },
            { get text() { return i18n.t('bodyType:quiz.questions.3.options.1') }, scores: { triangle: 2 } },
            { get text() { return i18n.t('bodyType:quiz.questions.3.options.2') }, scores: { round: 2 } },
            { get text() { return i18n.t('bodyType:quiz.questions.3.options.3') }, scores: { rectangle: 2 } },
            { get text() { return i18n.t('bodyType:quiz.questions.3.options.4') }, scores: { hourglass: 2 } }
        ]
    },
    {
        get question() { return i18n.t('bodyType:quiz.questions.4.question') },
        options: [
            { get text() { return i18n.t('bodyType:quiz.questions.4.options.0') }, scores: { hourglass: 2, rectangle: 1 } },
            { get text() { return i18n.t('bodyType:quiz.questions.4.options.1') }, scores: { inverted: 1, triangle: 1, hourglass: 1 } },
            { get text() { return i18n.t('bodyType:quiz.questions.4.options.2') }, scores: { round: 2, triangle: 1 } }
        ]
    }
];

function outfitToHex(outfit) {
    const result = {};
    for (const part in outfit) {
        if (COLORS_60[outfit[part]]) {
            result[part] = COLORS_60[outfit[part]].hex;
        } else {
            result[part] = outfit[part];
        }
    }
    return result;
}

