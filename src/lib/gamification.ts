// @ts-nocheck
// ================================================================
// gamification.ts — 레벨/배지/주간 챌린지/칭호 시험 시스템
// 원본: 바루픽_최신본.html 6483~6760행
// ================================================================

import { profile } from './profile'


export const gamification = {
    _cache: null,
    _cacheTime: 0,

    // 캐시 (같은 렌더 사이클 내 중복 계산 방지)
    _getData() {
        const now = Date.now();
        if (this._cache && now - this._cacheTime < 500) return this._cache;

        let records = [], savedCount = 0, closetCount = 0, quizDone = false, pcType = null;
        try { records = JSON.parse(localStorage.getItem('sp_ootd_records') || '[]'); } catch(e) {}
        try { savedCount = JSON.parse(localStorage.getItem('cs_saved') || '[]').length; } catch(e) {}
        try { closetCount = JSON.parse(localStorage.getItem('cs_closet') || '[]').length; } catch(e) {}
        try { quizDone = !!localStorage.getItem('sp_quiz_result'); } catch(e) {}
        pcType = profile.getPersonalColor();

        // 연속 기록 (streak)
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            if (records.some(r => r.date === d.toISOString().slice(0,10))) streak++;
            else break;
        }

        // 사진 포함 기록 수
        const photoRecords = records.filter(r => r.photos && r.photos.length > 0).length;

        // 사용된 유니크 컬러 수
        const usedColors = new Set();
        records.forEach(r => {
            if (r.colors) Object.values(r.colors).forEach(c => { if (c) usedColors.add(c); });
        });

        // 칭호 시험 결과
        let titleResults = [];
        try { titleResults = JSON.parse(localStorage.getItem('sp_title_results') || '[]'); } catch(e) {}

        // 챌린지 완료 수
        let challengesDone = 0;
        try { challengesDone = JSON.parse(localStorage.getItem('sp_challenges_done') || '[]').length; } catch(e) {}

        this._cache = { records, savedCount, closetCount, quizDone, pcType, streak, photoRecords, usedColors, titleResults, challengesDone };
        this._cacheTime = now;
        return this._cache;
    },

    invalidate() { this._cache = null; },

    // === XP 시스템 ===
    XP_TABLE: {
        ootd: 10,         // OOTD 기록 1회
        ootdPhoto: 3,     // 사진 포함 기록 보너스
        save: 5,          // 코디 저장
        closet: 3,        // 옷장 등록
        quiz: 20,         // 퀴즈 완료
        streak3: 15,      // 3일 연속 보너스
        streak7: 30,      // 7일 연속 보너스
        streak30: 100,    // 30일 연속 보너스
        badge: 10,        // 배지 1개 획득
        titleExam: 25,    // 칭호 시험 통과
        challenge: 20,    // 챌린지 완료
        pcDiagnosis: 15,  // 퍼스널컬러 진단
        colorVariety10: 20, // 10가지 이상 컬러 사용
    },

    getXP() {
        const d = this._getData();
        let xp = 0;
        xp += d.records.length * this.XP_TABLE.ootd;
        xp += d.photoRecords * this.XP_TABLE.ootdPhoto;
        xp += d.savedCount * this.XP_TABLE.save;
        xp += d.closetCount * this.XP_TABLE.closet;
        if (d.quizDone) xp += this.XP_TABLE.quiz;
        if (d.streak >= 3) xp += this.XP_TABLE.streak3;
        if (d.streak >= 7) xp += this.XP_TABLE.streak7;
        if (d.streak >= 30) xp += this.XP_TABLE.streak30;
        xp += d.titleResults.length * this.XP_TABLE.titleExam;
        xp += d.challengesDone * this.XP_TABLE.challenge;
        if (d.pcType) xp += this.XP_TABLE.pcDiagnosis;
        if (d.usedColors.size >= 10) xp += this.XP_TABLE.colorVariety10;
        // 배지 XP
        const badges = this.getBadges();
        xp += badges.filter(b => b.earned).length * this.XP_TABLE.badge;
        return xp;
    },

    LEVELS: [
        { level: 1, name: '코디 입문자', minExp: 0, icon: 'sprout' },
        { level: 2, name: '코디 탐험가', minExp: 50, icon: 'leaf' },
        { level: 3, name: '코디 수집가', minExp: 150, icon: 'tree-pine' },
        { level: 4, name: '스타일 연구가', minExp: 300, icon: 'compass' },
        { level: 5, name: '코디 달인', minExp: 500, icon: 'star' },
        { level: 6, name: '컬러 마스터', minExp: 800, icon: 'palette' },
        { level: 7, name: '스타일 마스터', minExp: 1200, icon: 'crown' }
    ],

    getLevel() {
        const xp = this.getXP();
        let cur = this.LEVELS[0], next = this.LEVELS[1];
        for (let i = this.LEVELS.length - 1; i >= 0; i--) {
            if (xp >= this.LEVELS[i].minExp) { cur = this.LEVELS[i]; next = this.LEVELS[i+1] || null; break; }
        }
        const progress = next ? Math.min(100, Math.round((xp - cur.minExp) / (next.minExp - cur.minExp) * 100)) : 100;
        return { ...cur, xp, next, progress };
    },

    // === 배지 시스템 ===
    getBadges() {
        const d = this._getData();
        return [
            { id:'first_step', lucide:'sprout', name:'첫 발걸음', desc:'첫 번째 OOTD 기록', earned: d.records.length >= 1, progress: Math.min(1, d.records.length), max: 1 },
            { id:'recorder', lucide:'camera', name:'기록왕', desc:'OOTD 10번 기록', earned: d.records.length >= 10, progress: Math.min(10, d.records.length), max: 10 },
            { id:'streak3', lucide:'flame', name:'3일 연속', desc:'3일 연속 기록 달성', earned: d.streak >= 3, progress: Math.min(3, d.streak), max: 3 },
            { id:'streak7', lucide:'zap', name:'7일 연속', desc:'7일 연속 기록 달성', earned: d.streak >= 7, progress: Math.min(7, d.streak), max: 7 },
            { id:'streak30', lucide:'rocket', name:'30일 연속', desc:'30일 연속 기록!', earned: d.streak >= 30, progress: Math.min(30, d.streak), max: 30 },
            { id:'closet_start', lucide:'archive', name:'옷장 시작', desc:'옷장에 첫 아이템 등록', earned: d.closetCount >= 1, progress: Math.min(1, d.closetCount), max: 1 },
            { id:'closet10', lucide:'layers', name:'옷장 컬렉터', desc:'옷장에 10개 이상', earned: d.closetCount >= 10, progress: Math.min(10, d.closetCount), max: 10 },
            { id:'saver', lucide:'bookmark', name:'코디 수집가', desc:'코디 5개 이상 저장', earned: d.savedCount >= 5, progress: Math.min(5, d.savedCount), max: 5 },
            { id:'photo_lover', lucide:'image', name:'사진 기록가', desc:'사진 포함 기록 5회', earned: d.photoRecords >= 5, progress: Math.min(5, d.photoRecords), max: 5 },
            { id:'color_variety', lucide:'palette', name:'컬러 탐험가', desc:'10가지 이상 컬러 사용', earned: d.usedColors.size >= 10, progress: Math.min(10, d.usedColors.size), max: 10 },
            { id:'quiz_master', lucide:'brain', name:'패션 박사', desc:'패션 퀴즈 완료', earned: d.quizDone, progress: d.quizDone ? 1 : 0, max: 1 },
            { id:'pc_diagnosed', lucide:'scan-face', name:'퍼스널컬러', desc:'퍼스널컬러 진단 완료', earned: !!d.pcType, progress: d.pcType ? 1 : 0, max: 1 },
            { id:'title_holder', lucide:'graduation-cap', name:'칭호 보유자', desc:'칭호 시험 1회 통과', earned: d.titleResults.length >= 1, progress: Math.min(1, d.titleResults.length), max: 1 },
            { id:'challenger', lucide:'target', name:'챌린저', desc:'챌린지 3회 완료', earned: d.challengesDone >= 3, progress: Math.min(3, d.challengesDone), max: 3 },
            { id:'master100', lucide:'crown', name:'스타일 마스터', desc:'OOTD 100번 기록', earned: d.records.length >= 100, progress: Math.min(100, d.records.length), max: 100 },
        ];
    },

    // === 컬러 통계 ===
    getColorStats() {
        const d = this._getData();
        const colorCount = {};
        const comboCount = {};

        d.records.forEach(r => {
            if (!r.colors) return;
            const parts = Object.entries(r.colors).filter(([k,v]) => v);
            parts.forEach(([k,v]) => { colorCount[v] = (colorCount[v] || 0) + 1; });

            // 2색 조합 카운트
            for (let i = 0; i < parts.length; i++) {
                for (let j = i+1; j < parts.length; j++) {
                    const pair = [parts[i][1], parts[j][1]].sort().join('+');
                    comboCount[pair] = (comboCount[pair] || 0) + 1;
                }
            }
        });

        const topColors = Object.entries(colorCount).sort((a,b) => b[1]-a[1]).slice(0, 10);
        const topCombos = Object.entries(comboCount).sort((a,b) => b[1]-a[1]).slice(0, 8);
        const diversity = d.usedColors.size;
        const totalRecords = d.records.length;

        return { topColors, topCombos, diversity, totalRecords };
    },

    // === 챌린지 시스템 ===
    CHALLENGE_TEMPLATES: [
        { id:'pastel_3', type:'color_group', name:'파스텔 위크', desc:'파스텔 컬러 코디 3회 기록', icon:'🎨', target:3, colorGroup:'pastel' },
        { id:'dark_3', type:'color_group', name:'다크 무드', desc:'다크톤 코디 3회 기록', icon:'🌙', target:3, colorGroup:'dark' },
        { id:'mono_2', type:'mono', name:'모노톤 챌린지', desc:'단색 계열 코디 2회', icon:'⬛', target:2 },
        { id:'photo_5', type:'photo', name:'포토제닉', desc:'사진 포함 기록 5회', icon:'📸', target:5 },
        { id:'streak_5', type:'streak', name:'5일 연속 기록', desc:'5일 연속으로 OOTD 기록', icon:'🔥', target:5 },
        { id:'variety_7', type:'variety', name:'컬러풀 위크', desc:'7가지 이상 다른 컬러 사용', icon:'🌈', target:7 },
        { id:'earth_3', type:'color_group', name:'어스톤 위크', desc:'어스톤 코디 3회 기록', icon:'🍂', target:3, colorGroup:'earth' },
        { id:'record_7', type:'records', name:'주간 기록왕', desc:'이번 주 7일 모두 기록', icon:'📅', target:7 },
    ],

    getWeeklyChallenges() {
        // 주차 기반 3개 챌린지 자동 선택
        const now = new Date();
        const weekNum = Math.floor((now - new Date(now.getFullYear(),0,1)) / (7*24*60*60*1000));
        const templates = this.CHALLENGE_TEMPLATES;
        const indices = [weekNum % templates.length, (weekNum + 3) % templates.length, (weekNum + 5) % templates.length];
        const unique = [...new Set(indices)].slice(0,3);
        while (unique.length < 3) { for (let i = 0; i < templates.length && unique.length < 3; i++) { if (!unique.includes(i)) unique.push(i); } }

        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0,0,0,0);
        const weekKey = weekStart.toISOString().slice(0,10);

        const d = this._getData();
        const weekRecords = d.records.filter(r => r.date >= weekKey);
        let doneChallenges = [];
        try { doneChallenges = JSON.parse(localStorage.getItem('sp_challenges_done') || '[]'); } catch(e) {}

        const colorGroups = {
            pastel: Object.keys(COLORS_60).filter(k => k.startsWith('pastel_')),
            dark: ['dark_red','dark_blue','dark_green','dark_purple','dark_brown','dark_olive','dark_teal','wine','forest','midnight','chocolate','slate','maroon','indigo','espresso'],
            earth: ['cognac','tan','sienna','terracotta','brick','dusty_rose','sage','moss','hunter_green','denim','steel_blue','mauve','brown','camel','khaki','olive']
        };

        return unique.map(idx => {
            const t = templates[idx];
            const cKey = weekKey + '_' + t.id;
            let progress = 0;

            if (t.type === 'color_group') {
                const grp = colorGroups[t.colorGroup] || [];
                progress = weekRecords.filter(r => r.colors && Object.values(r.colors).some(c => grp.includes(c))).length;
            } else if (t.type === 'mono') {
                progress = weekRecords.filter(r => {
                    if (!r.colors) return false;
                    const vals = Object.values(r.colors).filter(Boolean);
                    const unique = [...new Set(vals)];
                    return unique.length <= 2 && vals.length >= 2;
                }).length;
            } else if (t.type === 'photo') {
                progress = weekRecords.filter(r => r.photos && r.photos.length > 0).length;
            } else if (t.type === 'streak') {
                progress = Math.min(d.streak, t.target);
            } else if (t.type === 'variety') {
                const weekColors = new Set();
                weekRecords.forEach(r => { if (r.colors) Object.values(r.colors).forEach(c => { if (c) weekColors.add(c); }); });
                progress = weekColors.size;
            } else if (t.type === 'records') {
                progress = weekRecords.length;
            }

            const completed = progress >= t.target;
            const claimed = doneChallenges.includes(cKey);
            return { ...t, progress: Math.min(progress, t.target), completed, claimed, cKey };
        });
    },

    claimChallenge(cKey) {
        let done = [];
        try { done = JSON.parse(localStorage.getItem('sp_challenges_done') || '[]'); } catch(e) {}
        if (!done.includes(cKey)) {
            done.push(cKey);
            localStorage.setItem('sp_challenges_done', JSON.stringify(done));
            this.invalidate();
            return true;
        }
        return false;
    },

    // === 칭호 시험 ===
    TITLE_EXAMS: [
        { id:'beginner', name:'초급 코디네이터', desc:'기본 색상 조합 이해', icon:'🥉', minScore:3, questions:[
            { q:'네이비와 가장 잘 어울리는 하의 색상은?', opts:['베이지','네온그린','핫핑크','보라'], ans:0 },
            { q:'올블랙 코디에서 포인트를 줄 수 있는 아이템 색상은?', opts:['블랙','차콜','카멜','다크그레이'], ans:2 },
            { q:'무채색끼리의 조합에서 피해야 할 것은?', opts:['명도 차이 주기','비슷한 톤 반복','소재 변화','액세서리 활용'], ans:1 },
            { q:'데님과 가장 조화로운 상의 색상은?', opts:['화이트','네온핑크','라임','마젠타'], ans:0 },
            { q:'아이보리 상의에 어울리는 하의 조합은?', opts:['카키','네온옐로','핫핑크','라임그린'], ans:0 },
        ]},
        { id:'intermediate', name:'중급 코디네이터', desc:'컬러 하모니 이론 활용', icon:'🥈', minScore:4, questions:[
            { q:'유사색 조합(Analogous)의 특징은?', opts:['강한 대비','부드러운 조화','무채색 중심','보색 활용'], ans:1 },
            { q:'쿨톤에 해당하지 않는 색상은?', opts:['로즈핑크','라벤더','카멜','파우더블루'], ans:2 },
            { q:'봄 웜톤에 가장 어울리는 조합은?', opts:['코랄+아이보리','버건디+네이비','블랙+차콜','와인+다크퍼플'], ans:0 },
            { q:'3색 코디에서 비율의 황금 법칙은?', opts:['33:33:33','60:30:10','50:30:20','70:20:10'], ans:1 },
            { q:'보색 대비를 부드럽게 만드는 방법은?', opts:['채도를 낮추기','더 강한 색 추가','패턴 사용','레이어 추가'], ans:0 },
        ]},
        { id:'advanced', name:'고급 코디네이터', desc:'전문 스타일링 감각', icon:'🥇', minScore:4, questions:[
            { q:'톤온톤(Tone-on-Tone) 코디의 핵심은?', opts:['같은 색의 명도 변화','보색 대비','무채색만 사용','패턴 믹스'], ans:0 },
            { q:'웜톤이 쿨톤 컬러를 활용하려면?', opts:['피부에서 먼 하의에 배치','얼굴 근처 상의에 배치','전신에 사용','사용하지 않기'], ans:0 },
            { q:'캡슐 워드로브의 컬러 구성 원칙은?', opts:['비비드 컬러 중심','베이직 70%+포인트 30%','모든 계절 컬러 포함','트렌드 컬러만'], ans:1 },
            { q:'색채 심리학에서 "신뢰감"을 주는 색상은?', opts:['레드','네이비','옐로','핑크'], ans:1 },
            { q:'고급스러운 느낌의 컬러 조합은?', opts:['네온 그린+핫핑크','버건디+골드','라임+마젠타','오렌지+퍼플'], ans:1 },
        ]},
    ],

    getTitleResults() {
        try { return JSON.parse(localStorage.getItem('sp_title_results') || '[]'); } catch(e) { return []; }
    },

    saveTitleResult(examId, score, passed) {
        let results = this.getTitleResults();
        const existing = results.findIndex(r => r.id === examId);
        if (existing >= 0) { results[existing] = { id: examId, score, passed, date: new Date().toISOString().slice(0,10) }; }
        else { results.push({ id: examId, score, passed, date: new Date().toISOString().slice(0,10) }); }
        localStorage.setItem('sp_title_results', JSON.stringify(results));
        this.invalidate();
    }
};

