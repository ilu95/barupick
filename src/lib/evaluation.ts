// @ts-nocheck
// ================================================================
// evaluation.ts — 코디 점수 평가 알고리즘 (HCL 색상 이론 기반)
// 원본: 바루픽_최신본.html 5309~6160행
// ⚠️ 이 알고리즘의 점수 계산은 기존과 100% 동일해야 합니다.
// ================================================================

import { COLORS_60, COLORS, hcl, H, Cv, L, hex, temp, COLOR_FAMILIES, WARM_SET, COOL_SET, getHueDiff, isNeutralColor, getToneGroup, getColorTemperature, PASTEL_COLORS, EARTH_TONE_COLORS, CLASSIC_COMBOS, AVOID_COMBOS } from './colors'
import { PERSONAL_COLOR_12, FACE_NEAR_ITEMS } from './personalColor'
import { BODY_GUIDE_DATA } from './bodyType'
import { profile } from './profile'


export const evaluationSystem = {
    // 무채색 판별
    isNeutral(colorKey) {
        const neutralKeys = ['white', 'ivory', 'beige', 'lightgray', 'gray', 'charcoal', 'black', 'cream', 'taupe'];
        return neutralKeys.includes(colorKey);
    },

    // 유효 색상 카운트
    countEffectiveColors(outfit) {
        const colors = Object.values(outfit).filter(c => c);
        const uniqueColors = [...new Set(colors)];

        let chromaticCount = 0;
        let neutralCount = 0;

        uniqueColors.forEach(colorKey => {
            if (this.isNeutral(colorKey)) {
                neutralCount++;
            } else {
                chromaticCount++;
            }
        });

        const effectiveCount = chromaticCount + (neutralCount * 0.5);

        return {
            unique: uniqueColors.length,
            chromatic: chromaticCount,
            neutral: neutralCount,
            effective: effectiveCount,
            colors: uniqueColors
        };
    },

    // 색상 반복 비율
    calculateColorRepeatRatio(outfit) {
        const colors = Object.values(outfit).filter(c => c);
        const uniqueColors = [...new Set(colors)];

        if (uniqueColors.length === 1) return 1.0;

        const colorCounts = {};
        colors.forEach(color => {
            colorCounts[color] = (colorCounts[color] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(colorCounts));
        return maxCount / colors.length;
    },

    // ── V6 쌍별 점수 (공용: harmony와 goldilocksPlacement 모두 사용) ──
    // 두 색상 키의 조화 점수를 반환 (-55 ~ +120 범위)
    _calculatePairV6Score(colorKey1, colorKey2) {
        const c1 = COLORS_60[colorKey1];
        const c2 = COLORS_60[colorKey2];
        if (!c1 || !c2) return 0;

        const [h1, ch1, l1] = c1.hcl;
        const [h2, ch2, l2] = c2.hcl;

        const hueDiff = getHueDiff(h1, h2);
        const lDiff = Math.abs(l1 - l2);
        const cDiff = Math.abs(ch1 - ch2);

        const tone1 = getToneGroup(h1, ch1, l1);
        const tone2 = getToneGroup(h2, ch2, l2);

        let pairScore = 0;
        let hasSpecialCombo = false;
        let hasPenalty = false;

        // 1단계: 특수 조합
        if (AVOID_COMBOS[colorKey1]?.includes(colorKey2) ||
            AVOID_COMBOS[colorKey2]?.includes(colorKey1)) {
            pairScore -= 55;
            hasPenalty = true;
        } else if (CLASSIC_COMBOS[colorKey1]?.includes(colorKey2) ||
            CLASSIC_COMBOS[colorKey2]?.includes(colorKey1)) {
            pairScore += 55;
            hasSpecialCombo = true;
        } else if (hueDiff < 30 && lDiff >= 30 && ch1 > 12 && ch2 > 12) {
            pairScore += 45; // 톤온톤
            hasSpecialCombo = true;
        } else if (PASTEL_COLORS.includes(colorKey1) && PASTEL_COLORS.includes(colorKey2)) {
            pairScore += 40;
            hasSpecialCombo = true;
        } else if (EARTH_TONE_COLORS.includes(colorKey1) && EARTH_TONE_COLORS.includes(colorKey2)) {
            pairScore += 35;
            hasSpecialCombo = true;
        }

        // 2단계: 감점
        if (!hasSpecialCombo && !hasPenalty) {
            if (hueDiff < 15 && lDiff < 25 && ch1 > 12 && ch2 > 12) {
                pairScore -= 45;
                hasPenalty = true;
            } else if (tone1 === 'bright' && tone2 === 'bright' &&
                hueDiff >= 100 && hueDiff <= 140) {
                pairScore -= 40;
                hasPenalty = true;
            } else if (ch1 >= 50 && ch2 >= 50 && hueDiff >= 50 && hueDiff <= 100) {
                pairScore -= 25;
                hasPenalty = true;
            }
        }

        // 3단계: 가점
        if (!hasPenalty) {
            const isNeutral1 = isNeutralColor(ch1);
            const isNeutral2 = isNeutralColor(ch2);

            if (isNeutral1 || isNeutral2) {
                pairScore += 30;
                if (isNeutral1 && !isNeutral2) pairScore += 18;
                else if (!isNeutral1 && isNeutral2) pairScore += 15;
            }

            if (lDiff >= 50) pairScore += 28;
            else if (lDiff >= 35) pairScore += 20;
            else if (lDiff >= 20) pairScore += 12;

            if ((tone1 === 'deep' && l2 >= 60) || (tone2 === 'deep' && l1 >= 60)) {
                pairScore += 22;
            }

            const temp1 = getColorTemperature(h1, ch1, l1);
            const temp2 = getColorTemperature(h2, ch2, l2);
            if (temp1.temp === temp2.temp && temp1.temp !== 'neutral') {
                pairScore += 15;
            }

            if (hueDiff >= 15 && hueDiff <= 60 && ch1 > 12 && ch2 > 12) {
                pairScore += 18;
            }

            if (cDiff < 30 && ch1 > 12 && ch2 > 12) {
                pairScore += 10;
            }
        }

        return pairScore;
    },

    // ================================================================
    // 컬러 배치 점수 (0-20점) — 기존 골디락스 대체
    // 기존: "색상 개수가 2~3개인가" → 개수 기반
    // 변경: "인접 부위끼리 잘 어울리는가 + 역할이 명확한가" → 품질 기반
    // ================================================================
    calculateGoldilocksScore(outfit) {
        const filledParts = Object.entries(outfit).filter(([_, v]) => v);
        if (filledParts.length < 2) return 10; // 1색: 기본 점수

        // ── 지표 A: 가중 인접 조화 (0~12점) ──
        const adjacencyA = this._calculateAdjacentScore(outfit);

        // ── 지표 B: 역할 명확성 (0~8점) ──
        const clarityB = this._calculateRoleClarity(outfit);

        return Math.min(20, Math.round(adjacencyA + clarityB));
    },

    // 지표 A: 인접 부위 간 가중 조화 점수
    _calculateAdjacentScore(outfit) {
        // 시각적 중요도 순 인접 쌍 정의
        const ADJACENT_PAIRS = [
            ['top', 'bottom', 3.0],       // 가장 눈에 띄는 경계
            ['outer', 'top', 2.0],        // 아우터↔이너
            ['bottom', 'shoes', 2.0],     // 하단 마무리
            ['outer', 'middleware', 1.5],  // 아우터↔중간층
            ['middleware', 'top', 1.5],    // 중간층↔이너
            ['scarf', 'top', 1.0],        // 목도리↔상의
            ['scarf', 'outer', 1.0],      // 목도리↔아우터
            ['hat', 'top', 0.5],          // 모자↔상의
        ];

        let weightedSum = 0;
        let totalWeight = 0;

        ADJACENT_PAIRS.forEach(([partA, partB, weight]) => {
            const colorA = outfit[partA];
            const colorB = outfit[partB];
            if (!colorA || !colorB) return; // 해당 부위가 없으면 스킵

            let pairScore;
            if (colorA === colorB) {
                // 동일색 인접: 의도적 매칭. 좋지만 만점은 아님 (ceiling 80%)
                pairScore = 50; // V6 범위에서 moderate-good
            } else {
                pairScore = this._calculatePairV6Score(colorA, colorB);
            }

            weightedSum += pairScore * weight;
            totalWeight += weight;
        });

        if (totalWeight === 0) return 6; // 인접 쌍이 없음 (2색인데 떨어진 부위)

        // V6 가중 평균 (-55 ~ +120) → 0~12 스케일링
        const weightedAvg = weightedSum / totalWeight;

        if (weightedAvg >= 65) return 12;
        if (weightedAvg >= 50) return 11;
        if (weightedAvg >= 40) return 10;
        if (weightedAvg >= 30) return 9;
        if (weightedAvg >= 20) return 8;
        if (weightedAvg >= 10) return 7;
        if (weightedAvg >= 0) return 6;
        if (weightedAvg >= -15) return 4;
        if (weightedAvg >= -30) return 2;
        return 1;
    },

    // 지표 B: 역할 명확성 — 코디에서 색상의 역할 구분이 명확한가
    _calculateRoleClarity(outfit) {
        const layerWeights = {
            'outer': 40, 'middleware': 25, 'top': 20, 'bottom': 35,
            'scarf': 10, 'hat': 5, 'shoes': 15
        };

        const colorAreas = {};
        let totalArea = 0;

        Object.entries(outfit).forEach(([item, colorKey]) => {
            if (!colorKey) return;
            const weight = layerWeights[item] || 15;
            colorAreas[colorKey] = (colorAreas[colorKey] || 0) + weight;
            totalArea += weight;
        });

        if (totalArea === 0) return 4;

        const uniqueColors = Object.keys(colorAreas).length;
        const sortedRatios = Object.values(colorAreas)
            .sort((a, b) => b - a)
            .map(area => area / totalArea);

        // 1색: 모노크롬 — 명확하지만 조합 노력 없음
        if (uniqueColors === 1) return 5;

        // 2색: 역할이 자동으로 명확
        if (uniqueColors === 2) {
            const gap = sortedRatios[0] - sortedRatios[1];
            if (gap > 0.3) return 8; // 확실한 주/보조
            if (gap > 0.15) return 7; // 적당한 차이
            return 6; // 거의 반반이어도 2색은 기본 명확
        }

        // 3색 이상: dominant의 존재감 + 상위 2색 집중도
        const dominantRatio = sortedRatios[0];
        const top2Ratio = sortedRatios[0] + (sortedRatios[1] || 0);

        if (dominantRatio > 0.45) return 8; // 확실한 주인공 (45%+)
        if (dominantRatio > 0.35) return 7; // 주인공이 보임 (35%+)
        if (top2Ratio > 0.65) return 6;     // 2색이 전체의 65%+ → 구조 있음
        if (top2Ratio > 0.55) return 5;     // 2색이 55%+ → 약한 구조
        if (uniqueColors >= 5) return 3;    // 5색+ & 분산 → 역할 모호
        return 4;                           // 기본
    },

    // 60-30-10 비율 점수 (0-15점)
    calculate603010Score(outfit) {
        const layerWeights = {
            'outer': 40, 'middleware': 25, 'top': 20, 'bottom': 35,
            'scarf': 10, 'hat': 5, 'shoes': 15
        };

        const colorAreas = {};
        let totalArea = 0;

        Object.entries(outfit).forEach(([item, colorKey]) => {
            if (!colorKey) return;
            const weight = layerWeights[item] || 15;
            colorAreas[colorKey] = (colorAreas[colorKey] || 0) + weight;
            totalArea += weight;
        });

        if (totalArea === 0) return 5;

        const sortedRatios = Object.values(colorAreas)
            .sort((a, b) => b - a)
            .map(area => area / totalArea);

        if (sortedRatios.length < 2) return 5;

        const ideal = [0.6, 0.3, 0.1];
        let deviationSum = 0;

        for (let i = 0; i < Math.min(3, sortedRatios.length); i++) {
            deviationSum += Math.abs(sortedRatios[i] - ideal[i]);
        }

        const avgDeviation = deviationSum / 3;

        if (avgDeviation < 0.1) return 15;
        if (avgDeviation < 0.15) return 12;
        if (avgDeviation < 0.2) return 10;
        if (avgDeviation < 0.25) return 8;
        return 5;
    },

    // 조화도 점수 (0-10점) - V6 로직 적용 (공용 _calculatePairV6Score 사용)
    evaluateHarmony(outfit) {
        const colors = Object.values(outfit).filter(c => c);
        if (colors.length < 2) return 5;

        let totalScore = 0;
        let comparisons = 0;

        for (let i = 0; i < colors.length; i++) {
            for (let j = i + 1; j < colors.length; j++) {
                const pairScore = this._calculatePairV6Score(colors[i], colors[j]);
                totalScore += pairScore;
                comparisons++;
            }
        }

        if (comparisons === 0) return 5;

        // V6 점수를 0-10점으로 스케일링
        const avgV6Score = totalScore / comparisons;

        let scaledScore;
        if (avgV6Score >= 70) scaledScore = 10;
        else if (avgV6Score >= 55) scaledScore = 9;
        else if (avgV6Score >= 45) scaledScore = 8;
        else if (avgV6Score >= 35) scaledScore = 7;
        else if (avgV6Score >= 25) scaledScore = 6;
        else if (avgV6Score >= 15) scaledScore = 5;
        else if (avgV6Score >= 5) scaledScore = 4;
        else if (avgV6Score >= -10) scaledScore = 3;
        else if (avgV6Score >= -30) scaledScore = 2;
        else scaledScore = 1;

        return scaledScore;
    },

    // 계절감 점수 (0-10점)
    evaluateSeason(outfit) {
        const autumnColors = ['brown', 'camel', 'burgundy', 'olive', 'khaki', 'taupe',
            'autumn_red', 'autumn_orange', 'mustard', 'forest_green', 'rust', 'terracotta'];
        const neutralColors = ['black', 'white', 'gray', 'charcoal', 'navy', 'beige', 'ivory', 'cream'];

        const colors = Object.values(outfit).filter(c => c);
        let score = 0;

        colors.forEach(colorKey => {
            if (autumnColors.includes(colorKey)) score += 8;
            else if (neutralColors.includes(colorKey)) score += 5;
            else score += 3;
        });

        return Math.min(10, Math.round(score / colors.length * 1.2));
    },

    // 밸런스 점수 (0-5점)
    evaluateBalance(outfit) {
        const colors = Object.values(outfit).filter(c => c);
        if (colors.length < 2) return 3;

        const lValues = colors.map(c => COLORS_60[c]?.hcl[2] || 50);
        const minL = Math.min(...lValues);
        const maxL = Math.max(...lValues);
        const lDiff = maxL - minL;

        let score = 0;
        if (lDiff > 50) score = 5;
        else if (lDiff > 30) score = 4;
        else if (lDiff > 15) score = 3;
        else score = 2;

        return score;
    },

    // 퍼스널 컬러 점수 (0-10점) - 12톤 시스템 적용
    evaluatePersonalColor(outfit, personalColorType) {
        if (!personalColorType || personalColorType === 'unknown') return 0;

        // 12톤 시스템에서 데이터 가져오기
        const pcData = PERSONAL_COLOR_12[personalColorType];

        // 12톤에 없으면 기존 4계절 시스템으로 폴백
        if (!pcData) {
            const pcColors = {
                spring_warm: ['coral', 'peach', 'cream', 'ivory', 'warm_yellow', 'light_orange', 'camel'],
                summer_cool: ['pastel_pink', 'pastel_blue', 'lavender', 'lightgray', 'dusty_rose', 'periwinkle'],
                autumn_warm: ['brown', 'burgundy', 'olive', 'mustard', 'terracotta', 'rust', 'camel', 'khaki'],
                winter_cool: ['black', 'white', 'navy', 'royal_blue', 'bright_red', 'charcoal', 'wine']
            };
            const recommendedColors = pcColors[personalColorType] || [];
            const faceItems = ['outer', 'middleware', 'top'];
            let matchCount = 0;
            let checkedCount = 0;

            faceItems.forEach(item => {
                if (outfit[item]) {
                    checkedCount++;
                    if (recommendedColors.includes(outfit[item])) {
                        matchCount++;
                    }
                }
            });

            if (checkedCount === 0) return 0;
            return Math.round((matchCount / checkedCount) * 10);
        }

        const bestColors = pcData.bestColors || [];
        const avoidColors = pcData.avoidColors || [];

        // 얼굴 근처 아이템만 체크 (퍼스널 컬러에 영향을 주는 부분)
        let totalScore = 0;
        let checkedCount = 0;

        FACE_NEAR_ITEMS.forEach(item => {
            if (outfit[item]) {
                checkedCount++;
                const colorKey = outfit[item];

                if (bestColors.includes(colorKey)) {
                    // Best 색상: +10점
                    totalScore += 10;
                } else if (avoidColors.includes(colorKey)) {
                    // 피해야 할 색상: -5점 (마이너스)
                    totalScore -= 5;
                } else {
                    // 중립 색상: +3점
                    totalScore += 3;
                }
            }
        });

        if (checkedCount === 0) return 0;

        // 평균 점수 계산 후 0-10 범위로 정규화
        const avgScore = totalScore / checkedCount;
        // -5 ~ 10 범위를 0 ~ 10으로 매핑
        const normalizedScore = Math.max(0, Math.min(10, Math.round((avgScore + 5) / 15 * 10)));

        return normalizedScore;
    },

    // 이론 탐지
    detectTheory(outfit) {
        const colors = Object.values(outfit).filter(c => c);
        const theories = new Set();

        const hclValues = colors.map(c => COLORS_60[c]?.hcl).filter(Boolean);
        if (hclValues.length < 2) return ["단색"];

        const lValues = hclValues.map(v => v[2]);
        const hValues = hclValues.map(v => v[0]);
        const cValues = hclValues.map(v => v[1]);

        const lDiff = Math.max(...lValues) - Math.min(...lValues);
        const cDiff = Math.max(...cValues) - Math.min(...cValues);

        const hueDiff = (h1, h2) => {
            const diff = Math.abs(h1 - h2);
            return Math.min(diff, 360 - diff);
        };

        let maxHDiff = 0;
        for (let i = 0; i < hValues.length; i++) {
            for (let j = i + 1; j < hValues.length; j++) {
                maxHDiff = Math.max(maxHDiff, hueDiff(hValues[i], hValues[j]));
            }
        }

        if (hclValues.every(v => v[1] < 15)) theories.add("무채색 조화");
        if (maxHDiff < 30) theories.add("톤온톤");
        if (lDiff < 20 && cDiff < 20 && maxHDiff > 35) theories.add("톤인톤");
        if (maxHDiff > 30 && maxHDiff < 60) theories.add("유사색");
        if (maxHDiff > 150 && maxHDiff < 210) theories.add("보색");

        return theories.size > 0 ? Array.from(theories) : ["자유 배색"];
    },

    // 피드백 생성
    generateFeedback(scores, outfit, personalColorType) {
        const { goldilocks, ratio, harmony, season, balance, personal } = scores;
        let feedback = "";

        // 컬러 배치 피드백
        if (goldilocks >= 18) {
            feedback += "컬러 배치가 완벽해요! 부위별 색상이 자연스럽게 연결됩니다. ";
        } else if (goldilocks >= 14) {
            feedback += "컬러 배치가 좋아요. 인접한 옷끼리 잘 어울려요. ";
        } else if (goldilocks >= 10) {
            feedback += "컬러 배치가 괜찮아요. ";
        } else if (goldilocks >= 6) {
            feedback += "인접한 부위의 색상 연결을 좀 더 신경쓰면 좋겠어요. ";
        } else {
            feedback += "색상 배치를 개선해보세요. 인접한 옷끼리 톤을 맞추면 훨씬 나아질 거예요. ";
        }

        // 비율 피드백
        if (ratio >= 12) {
            feedback += "색상 비율이 이상적이에요! ";
        } else if (ratio >= 8) {
            feedback += "색상 비율이 적절해요. ";
        } else if (ratio < 5) {
            feedback += "주 색상과 보조 색상의 비율을 조정하면 더 좋아질 거예요. ";
        }

        // 조화도 피드백
        if (harmony >= 8) {
            feedback += "색상 조화가 아주 좋아요! ";
        } else if (harmony >= 5) {
            feedback += "색상 조화가 괜찮아요. ";
        } else {
            feedback += "색상 조화를 더 신경쓰면 좋겠어요. ";
        }

        // 계절감 피드백
        if (season >= 8) {
            feedback += "계절감이 완벽해요! ";
        } else if (season >= 5) {
            feedback += "계절감이 느껴져요. ";
        }

        // 퍼스널 컬러 피드백 (12톤 시스템)
        if (personalColorType && personalColorType !== 'unknown') {
            const pcData = PERSONAL_COLOR_12[personalColorType];
            if (pcData) {
                const avoidColors = pcData.avoidColors || [];

                // 피해야 할 색상 착용 여부 체크 (얼굴 근처만)
                const wornAvoidColors = FACE_NEAR_ITEMS
                    .filter(item => outfit[item] && avoidColors.includes(outfit[item]))
                    .map(item => {
                        const color = COLORS_60[outfit[item]];
                        return color?.name || outfit[item];
                    });

                if (wornAvoidColors.length > 0) {
                    feedback += `⚠️ ${pcData.name}에게 ${wornAvoidColors.join(', ')}은(는) 피하는 게 좋아요. `;
                } else if (personal >= 8) {
                    feedback += "나에게 아주 잘 어울리는 색이에요! ⭐";
                } else if (personal >= 5) {
                    feedback += "무난하게 어울리는 색이에요.";
                } else if (personal >= 3) {
                    feedback += "퍼스널컬러와 더 맞는 색상을 추천드려요.";
                }
            }
        }

        return feedback.trim();
    },

    // 종합 평가
    // 체형 보완 점수 (0-5점) - fitMode ON일 때만
    evaluateBodyFit(outfit) {
        const bt = profile.getBodyType();
        if (!bt || !profile.getFitMode()) return 0;
        const bd = BODY_GUIDE_DATA[bt];
        if (!bd || !bd.colorRules) return 0;
        const rules = bd.colorRules;
        let match = 0, total = 0;
        Object.entries(outfit).forEach(([part, colorKey]) => {
            if (!colorKey) return;
            const rule = rules[part];
            if (!rule || rule === 'any') return;
            total++;
            const c = COLORS_60[colorKey];
            if (!c) return;
            const L = c.hcl[2];
            if (rule === 'light' && L >= 55) match++;
            else if (rule === 'dark' && L <= 45) match++;
            else if (rule === 'match-bottom' && outfit.bottom && colorKey === outfit.bottom) match++;
            else if (rule === 'match-shoes' && outfit.shoes && colorKey === outfit.shoes) match++;
            else if (rule === 'monochrome') { match += 0.5; }
        });
        if (total === 0) return 3;
        return Math.round((match / total) * 5);
    },

    evaluate(outfit, personalColorType) {
        const goldilocks = this.calculateGoldilocksScore(outfit);
        const ratio = this.calculate603010Score(outfit);
        const harmony = this.evaluateHarmony(outfit);
        const season = this.evaluateSeason(outfit);
        const balance = this.evaluateBalance(outfit);
        const personal = this.evaluatePersonalColor(outfit, personalColorType);
        const bodyFit = this.evaluateBodyFit(outfit);

        const hasPersonalColor = personalColorType && personalColorType !== 'unknown' && personal > 0;
        const hasBodyFit = profile.getFitMode() && profile.getBodyType() && bodyFit > 0;

        // 동적 분모: 활성 항목에 따라 조정
        let rawMax = 55; // base: placement(20)+ratio(10)+harmony(10)+season(10)+balance(5)
        if (hasPersonalColor) rawMax += 10;
        if (hasBodyFit) rawMax += 5;
        const denom = Math.max(rawMax + 5, 60); // 최소 60
        const scale = 100 / denom;

        const goldilocksScaled = Math.round(goldilocks * scale * 100) / 100;
        const ratioScaled = Math.round(ratio * scale * 100) / 100;
        const harmonyScaled = Math.round(harmony * scale * 100) / 100;
        const seasonScaled = Math.round(season * scale * 100) / 100;
        const balanceScaled = Math.round(balance * scale * 100) / 100;
        const personalScaled = hasPersonalColor ? Math.round(personal * scale * 100) / 100 : 0;
        const bodyFitScaled = hasBodyFit ? Math.round(bodyFit * scale * 100) / 100 : 0;

        const total = Math.round(goldilocksScaled + ratioScaled + harmonyScaled + seasonScaled + balanceScaled + personalScaled + bodyFitScaled);

        const scores = {
            goldilocks: goldilocksScaled,
            ratio: ratioScaled,
            harmony: harmonyScaled,
            season: seasonScaled,
            balance: balanceScaled,
            personal: personalScaled,
            bodyFit: bodyFitScaled
        };

        return {
            total: Math.min(total, 100),
            ...scores,
            hasPersonalColor,
            hasBodyFit,
            feedback: this.generateFeedback(scores, outfit, personalColorType),
            theory: this.detectTheory(outfit),
            colorInfo: this.countEffectiveColors(outfit)
        };
    },

    // ============================================================
    // 개선 제안 V2 - 패션 맥락 기반
    // ============================================================

    // 코디의 컬러 캐릭터 분석
    analyzeOutfitCharacter(outfit) {
        const items = Object.entries(outfit).filter(([k, v]) => v);
        const neutralKeys = ['white', 'ivory', 'beige', 'lightgray', 'gray', 'charcoal', 'black', 'cream', 'taupe', 'silver'];

        let warmCount = 0, coolCount = 0, neutralTempCount = 0;
        let chromaticItems = [], neutralItems = [];
        let totalL = 0, lValues = [];

        items.forEach(([item, colorKey]) => {
            const c = COLORS_60[colorKey];
            if (!c) return;
            const [h, ch, l] = c.hcl;
            totalL += l; lValues.push({ item, colorKey, l, ch, h });

            if (neutralKeys.includes(colorKey) || ch < 12) {
                neutralItems.push({ item, colorKey });
                neutralTempCount++;
            } else {
                chromaticItems.push({ item, colorKey, h, ch, l });
                const temp = getColorTemperature(h, ch, l);
                if (temp.temp === 'warm') warmCount++;
                else if (temp.temp === 'cool') coolCount++;
                else neutralTempCount++;
            }
        });

        const avgL = lValues.length ? totalL / lValues.length : 50;
        const lRange = lValues.length > 1 ? Math.max(...lValues.map(v => v.l)) - Math.min(...lValues.map(v => v.l)) : 0;
        const dominantTemp = warmCount > coolCount ? 'warm' : coolCount > warmCount ? 'cool' : 'neutral';
        const hasTempConflict = warmCount > 0 && coolCount > 0;
        const neutralRatio = items.length ? neutralItems.length / items.length : 0;
        const isAllNeutral = neutralRatio >= 0.8;
        const isAllDark = avgL < 35;
        const isAllLight = avgL > 70;
        const hasLowContrast = lRange < 20 && items.length >= 3;

        return {
            items, chromaticItems, neutralItems,
            warmCount, coolCount, dominantTemp, hasTempConflict,
            neutralRatio, isAllNeutral, isAllDark, isAllLight,
            hasLowContrast, avgL, lRange, lValues
        };
    },

    generateImprovements(outfit, currentScore, personalColorType) {
        const char = this.analyzeOutfitCharacter(outfit);
        const suggestions = [];
        const usedItems = new Set();

        // ── 1. 포인트 컬러 제안 (올 뉴트럴일 때) ──
        if (char.isAllNeutral && char.neutralItems.length >= 2) {
            const accentTargets = ['scarf', 'outer', 'middleware', 'top'];
            const accentItem = accentTargets.find(i => outfit[i] && !usedItems.has(i));
            if (accentItem) {
                const accents = ['burgundy', 'navy', 'olive', 'forest', 'wine', 'camel', 'terracotta',
                    'mustard', 'brick', 'cognac', 'denim', 'hunter_green', 'teal', 'cobalt'];
                const bestAccent = accents.find(ak => {
                    const c = COLORS_60[ak];
                    if (!c) return false;
                    if (char.isAllDark) return c.hcl[2] >= 35 && c.hcl[2] <= 55;
                    if (char.isAllLight) return c.hcl[2] >= 25 && c.hcl[2] <= 50;
                    return c.hcl[2] >= 25 && c.hcl[2] <= 55;
                });
                if (bestAccent && bestAccent !== outfit[accentItem]) {
                    suggestions.push({
                        item: accentItem, currentColor: outfit[accentItem], newColor: bestAccent,
                        category: 'accent', reason: '무채색 코디에 포인트 컬러를 더하면 시선이 모여요', icon: '🎯'
                    });
                    usedItems.add(accentItem);
                }
            }
        }

        // ── 2. 클래식 조합 제안 ──
        char.chromaticItems.forEach(({ item: cItem, colorKey: cKey }) => {
            if (usedItems.has(cItem) || suggestions.length >= 3) return;
            const partners = CLASSIC_COMBOS[cKey];
            if (!partners) return;
            const outfitColors = Object.values(outfit).filter(c => c);
            const hasPartner = partners.some(p => outfitColors.includes(p));
            if (hasPartner) return;

            const swapTargets = Object.entries(outfit)
                .filter(([k, v]) => v && k !== cItem && !usedItems.has(k))
                .sort((a, b) => (this.isNeutral(a[1]) ? 0 : 1) - (this.isNeutral(b[1]) ? 0 : 1));

            for (const [swapItem, swapColor] of swapTargets) {
                const cHcl = COLORS_60[cKey]?.hcl;
                if (!cHcl) break;
                const cTemp = getColorTemperature(cHcl[0], cHcl[1], cHcl[2]);
                const bestPartner = partners.find(p => {
                    const pc = COLORS_60[p];
                    if (!pc || p === swapColor || outfitColors.includes(p)) return false;
                    const pTemp = getColorTemperature(pc.hcl[0], pc.hcl[1], pc.hcl[2]);
                    return pTemp.temp === cTemp.temp || pTemp.temp === 'neutral' || cTemp.temp === 'neutral';
                });
                if (bestPartner) {
                    const cName = COLORS_60[cKey]?.name || cKey;
                    const pName = COLORS_60[bestPartner]?.name || bestPartner;
                    suggestions.push({
                        item: swapItem, currentColor: swapColor, newColor: bestPartner,
                        category: 'classic', reason: `${cName} + ${pName}는 검증된 클래식 조합이에요`, icon: '👔'
                    });
                    usedItems.add(swapItem);
                    break;
                }
            }
        });

        // ── 3. 온도 충돌 해소 ──
        if (char.hasTempConflict) {
            const minority = char.warmCount <= char.coolCount ? 'warm' : 'cool';
            const majorTemp = minority === 'warm' ? 'cool' : 'warm';

            char.chromaticItems.forEach(({ item, colorKey, h, ch, l }) => {
                if (usedItems.has(item) || suggestions.length >= 4) return;
                const temp = getColorTemperature(h, ch, l);
                if (temp.temp !== minority) return;

                const alternatives = Object.entries(COLORS_60).filter(([ak, ac]) => {
                    if (ak === colorKey || Object.values(outfit).includes(ak)) return false;
                    const [ah, ach, al] = ac.hcl;
                    const aTemp = getColorTemperature(ah, ach, al);
                    return aTemp.temp === majorTemp && Math.abs(al - l) < 20 && ach > 12;
                }).sort((a, b) => Math.abs(a[1].hcl[2] - l) - Math.abs(b[1].hcl[2] - l));

                if (alternatives.length > 0) {
                    suggestions.push({
                        item, currentColor: colorKey, newColor: alternatives[0][0],
                        category: 'temperature',
                        reason: `${majorTemp === 'warm' ? '웜' : '쿨'}톤으로 통일하면 코디가 정돈돼요`, icon: '🌡️'
                    });
                    usedItems.add(item);
                }
            });
        }

        // ── 4. 컬러 업그레이드 ──
        const UPGRADES = {
            'gray': ['slate', 'steel_blue', 'charcoal'],
            'lightgray': ['silver', 'powder_blue', 'sage'],
            'beige': ['camel', 'tan', 'cognac'],
            'cream': ['ivory', 'tan', 'powder_blue'],
            'white': ['ivory', 'cream', 'powder_blue'],
            'black': ['charcoal', 'navy', 'midnight'],
            'brown': ['cognac', 'sienna', 'camel'],
            'khaki': ['olive', 'sage', 'tan'],
            'taupe': ['mauve', 'dusty_rose', 'cognac']
        };

        Object.entries(outfit).forEach(([item, colorKey]) => {
            if (!colorKey || usedItems.has(item) || suggestions.length >= 4) return;
            const upgrades = UPGRADES[colorKey];
            if (!upgrades) return;
            const outfitColors = Object.values(outfit).filter(c => c);
            const available = upgrades.filter(u => !outfitColors.includes(u) && COLORS_60[u]);
            if (available.length === 0) return;

            const best = available.find(u => {
                if (char.dominantTemp === 'neutral') return true;
                const c = COLORS_60[u];
                const t = getColorTemperature(c.hcl[0], c.hcl[1], c.hcl[2]);
                return t.temp === char.dominantTemp || t.temp === 'neutral';
            }) || available[0];

            const fromName = COLORS_60[colorKey]?.name || colorKey;
            const toName = COLORS_60[best]?.name || best;
            suggestions.push({
                item, currentColor: colorKey, newColor: best,
                category: 'upgrade', reason: `${fromName}보다 ${toName}가 더 깊이감 있어요`, icon: '✨'
            });
            usedItems.add(item);
        });

        // ── 5. 명도 밸런스 ──
        if (char.hasLowContrast && suggestions.length < 5) {
            const areaOrder = ['bottom', 'outer', 'top', 'middleware', 'shoes', 'scarf'];
            for (const targetItem of areaOrder) {
                if (!outfit[targetItem] || usedItems.has(targetItem)) continue;
                const c = COLORS_60[outfit[targetItem]];
                if (!c) continue;
                const l = c.hcl[2];
                const targetL = l > 50 ? l - 30 : l + 30;

                const alternatives = Object.entries(COLORS_60)
                    .filter(([ak, ac]) => {
                        if (ak === outfit[targetItem] || Object.values(outfit).includes(ak)) return false;
                        return Math.abs(ac.hcl[2] - targetL) < 15;
                    })
                    .sort((a, b) => Math.abs(a[1].hcl[2] - targetL) - Math.abs(b[1].hcl[2] - targetL));

                const best = alternatives.find(([ak, ac]) => {
                    const t = getColorTemperature(ac.hcl[0], ac.hcl[1], ac.hcl[2]);
                    return t.temp === char.dominantTemp || t.temp === 'neutral';
                }) || alternatives[0];

                if (best) {
                    suggestions.push({
                        item: targetItem, currentColor: outfit[targetItem], newColor: best[0],
                        category: 'contrast', reason: '밝기 대비를 주면 코디에 입체감이 생겨요', icon: '🔲'
                    });
                    usedItems.add(targetItem);
                    break;
                }
            }
        }

        // ── 6. 퍼스널 컬러 최적화 ──
        if (personalColorType && suggestions.length < 5) {
            const pcData = PERSONAL_COLOR_12[personalColorType];
            if (pcData) {
                const bestColors = pcData.bestColors || [];
                const avoidColors = pcData.avoidColors || [];
                FACE_NEAR_ITEMS.forEach(item => {
                    if (!outfit[item] || usedItems.has(item) || suggestions.length >= 5) return;
                    if (avoidColors.includes(outfit[item])) {
                        const cl = COLORS_60[outfit[item]]?.hcl[2] || 50;
                        const replacement = bestColors.find(bc => {
                            const bcc = COLORS_60[bc];
                            return bcc && Math.abs(bcc.hcl[2] - cl) < 25 && !Object.values(outfit).includes(bc);
                        });
                        if (replacement) {
                            suggestions.push({
                                item, currentColor: outfit[item], newColor: replacement,
                                category: 'personal', reason: `${pcData.name}에게 더 어울리는 색이에요`, icon: '🎨'
                            });
                            usedItems.add(item);
                        }
                    }
                });
            }
        }

        // 점수 변화 계산 (참고용)
        suggestions.forEach(s => {
            const testOutfit = { ...outfit, [s.item]: s.newColor };
            const newResult = this.evaluate(testOutfit, personalColorType);
            s.newScore = newResult.total;
            s.improvement = Math.round((newResult.total - currentScore) * 10) / 10;
        });

        const priority = { accent: 1, classic: 2, personal: 3, temperature: 4, upgrade: 5, contrast: 6 };
        suggestions.sort((a, b) => (priority[a.category] || 99) - (priority[b.category] || 99));
        return suggestions.slice(0, 5);
    }
};

// ============================================================
// 📱 메인 앱
// ============================================================

// ============================================================
        function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// ============================================================
// 퍼스널 컬러 빛 진단 데이터
// ============================================================
var PC_LIGHT_STEPS = {
    undertone: [
        { stepNum: 1, phase: "언더톤 진단", instruction: "같은 핑크인데 톤만 달라요\n피부가 깨끗해 보이는 쪽은?", tip: "💡 익숙한 쪽이 아니라 피부가 예뻐 보이는 쪽을 고르세요", leftColor: "#FFA898", rightColor: "#F8A0C0", leftDesc: "웜 핑크", rightDesc: "쿨 핑크", leftValue: "warm", rightValue: "cool" },
        { stepNum: 2, phase: "언더톤 진단", instruction: "같은 초록인데 톤만 달라요\n피부가 깨끗해 보이는 쪽은?", tip: "💡 색이 예쁜 쪽이 아니라 '내 피부'가 예뻐 보이는 쪽!", leftColor: "#B8E080", rightColor: "#80E0C0", leftDesc: "웜 그린", rightDesc: "쿨 그린", leftValue: "warm", rightValue: "cool" },
        { stepNum: 3, phase: "언더톤 진단", instruction: "미세한 차이예요\n피부가 깨끗해 보이는 쪽은?", tip: "💡 비슷하게 느껴지면 '비슷해요'를 눌러도 OK", leftColor: "#F0E0C0", rightColor: "#D8E0F8", leftDesc: "아이보리 빛", rightDesc: "블루화이트 빛", leftValue: "warm", rightValue: "cool" }
    ],
    warm_value: [
        { stepNum: 4, phase: "명도 진단", instruction: "웜톤이시네요! 🌅\n밝은 빛 vs 깊은 빛\n피부가 깨끗해 보이는 쪽은?", tip: "💡 밝다고 좋은 게 아니에요 — 피부가 편안해 보이는 쪽!", leftColor: "#D8B8A0", rightColor: "#D0A890", leftDesc: "밝은 피치", rightDesc: "리치 앰버", leftValue: "light", rightValue: "deep" },
        { stepNum: 5, phase: "명도 진단", instruction: "한 번 더!\n피부가 깨끗해 보이는 쪽은?", tip: "💡 창백하게 뜨거나 칙칙하게 가라앉으면 안 맞는 톤", leftColor: "#D0C8A0", rightColor: "#C8B888", leftDesc: "라이트 골드", rightDesc: "딥 골드", leftValue: "light", rightValue: "deep" }
    ],
    cool_value: [
        { stepNum: 4, phase: "명도 진단", instruction: "쿨톤이시네요! ❄️\n밝은 빛 vs 깊은 빛\n피부가 깨끗해 보이는 쪽은?", tip: "💡 밝다고 좋은 게 아니에요 — 피부가 편안해 보이는 쪽!", leftColor: "#A0A8C8", rightColor: "#8898C8", leftDesc: "파우더 블루", rightDesc: "딥 블루", leftValue: "light", rightValue: "deep" },
        { stepNum: 5, phase: "명도 진단", instruction: "한 번 더!\n피부가 깨끗해 보이는 쪽은?", tip: "💡 창백하게 뜨거나 칙칙하게 가라앉으면 안 맞는 톤", leftColor: "#B0A8C0", rightColor: "#A098B8", leftDesc: "라이트 라일락", rightDesc: "딥 라일락", leftValue: "light", rightValue: "deep" }
    ],
    warm_chroma: [
        { stepNum: 6, phase: "채도 진단", instruction: "거의 다 왔어요!\n선명한 빛 vs 차분한 빛\n피부가 깨끗해 보이는 쪽은?", tip: "💡 선명한 빛에서 잡티가 눈에 띄면 차분한 톤이 맞아요", leftColor: "#F0A090", rightColor: "#D0B0A0", leftDesc: "비비드 코랄", rightDesc: "더스티 살몬", leftValue: "clear", rightValue: "muted" },
        { stepNum: 7, phase: "채도 진단", instruction: "마지막!\n피부가 깨끗해 보이는 쪽은?", tip: "💡 마지막이에요 — 직감을 믿어보세요!", leftColor: "#90D880", rightColor: "#B0C898", leftDesc: "비비드 그린", rightDesc: "세이지", leftValue: "clear", rightValue: "muted" }
    ],
    cool_chroma: [
        { stepNum: 6, phase: "채도 진단", instruction: "거의 다 왔어요!\n선명한 빛 vs 은은한 빛\n피부가 깨끗해 보이는 쪽은?", tip: "💡 선명한 빛에서 잡티가 눈에 띄면 은은한 톤이 맞아요", leftColor: "#E090C0", rightColor: "#C0A0B0", leftDesc: "비비드 핑크", rightDesc: "더스티 로즈", leftValue: "clear", rightValue: "muted" },
        { stepNum: 7, phase: "채도 진단", instruction: "마지막!\n피부가 깨끗해 보이는 쪽은?", tip: "💡 마지막이에요 — 직감을 믿어보세요!", leftColor: "#78B0F0", rightColor: "#98B0C8", leftDesc: "비비드 블루", rightDesc: "그레이 블루", leftValue: "clear", rightValue: "muted" }
    ]
};

// 빛 진단 결과 → PERSONAL_COLOR_12 매핑
var PC_LIGHT_RESULT_MAP = {
    'warm_light_clear': 'spring_bright',
    'warm_light_muted': 'spring_light',
    'warm_deep_clear': 'autumn_true',
    'warm_deep_muted': 'autumn_soft',
    'cool_light_clear': 'summer_light',
    'cool_light_muted': 'summer_muted',
    'cool_deep_clear': 'winter_bright',
    'cool_deep_muted': 'winter_deep'
};

// ============================================================
// 🏠 BARUSA COLOR STUDIO — 통합 앱 로직
// ============================================================

