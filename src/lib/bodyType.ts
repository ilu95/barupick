// @ts-nocheck
// ================================================================
// bodyType.ts — 체형 진단 + 체형별 코디 가이드 데이터
// 원본: 바루픽_최신본.html 4757~5129행
// ================================================================


export const BODY_TYPE_DIAGNOSIS = {
    questions: [
        {
            id: 1,
            question: "어깨와 엉덩이 너비를 비교하면?",
            options: [
                { text: "어깨가 더 넓어요", score: { inverted: 2 } },
                { text: "엉덩이가 더 넓어요", score: { triangle: 2 } },
                { text: "비슷해요", score: { rectangle: 1, hourglass: 1 } }
            ]
        },
        {
            id: 2,
            question: "허리 라인은 어떤가요?",
            options: [
                { text: "허리가 잘록한 편이에요", score: { hourglass: 2 } },
                { text: "허리와 엉덩이가 일자예요", score: { rectangle: 2 } },
                { text: "배 부분이 나온 편이에요", score: { round: 2 } }
            ]
        },
        {
            id: 3,
            question: "가장 고민되는 부위는?",
            options: [
                { text: "어깨가 좁아 보여요", score: { effect: 'shoulder-wide' } },
                { text: "어깨가 넓어 보여요", score: { effect: 'shoulder-narrow' } },
                { text: "배가 나와 보여요", score: { effect: 'belly' } },
                { text: "다리가 짧아 보여요", score: { effect: 'legs-long' } },
                { text: "키가 작아 보여요", score: { effect: 'height-tall' } },
                { text: "특별히 없어요", score: { effect: 'none' } }
            ]
        }
    ],
    effects: {
        'shoulder-wide': {
            name: '어깨 넓어 보이기',
            emoji: '💪',
            description: '밝은 색 상의와 보트넥/퍼프 소매로 어깨 라인을 강조해요.',
            rules: { top: 'light', bottom: 'dark' }
        },
        'shoulder-narrow': {
            name: '어깨 좁아 보이기',
            emoji: '🎨',
            description: '어두운 색 상의로 어깨를 시각적으로 줄이고, 밝은 하의로 시선을 분산해요.',
            rules: { top: 'dark', bottom: 'light' }
        },
        'belly': {
            name: '배 덜 나와 보이기',
            emoji: '🎯',
            description: '어두운 색 상의/미들웨어로 배 부분을 시각적으로 가려요.',
            rules: { top: 'dark', middleware: 'dark' }
        },
        'legs-long': {
            name: '다리 길어 보이기',
            emoji: '👖',
            description: '하의와 신발 색상을 맞춰서 다리 라인을 길어 보이게 해요.',
            rules: { bottom: 'match-shoes', shoes: 'match-bottom' }
        },
        'height-tall': {
            name: '키 커 보이기',
            emoji: '📏',
            description: '단색 또는 유사한 톤으로 세로 라인을 강조해요.',
            rules: { all: 'monochrome' }
        },
        'none': {
            name: '컬러 조화만',
            emoji: '✨',
            description: '체형 보완 없이 순수한 컬러 조화만 고려해요.',
            rules: {}
        }
    }
};

// ============================================================
// 체형별 코디 가이드 — 5가지 체형 × 2성별 + 상세 가이드
// ============================================================
export const BODY_GUIDE_DATA = {
    inverted: {
        name: '역삼각형', emoji: '🔻', icon: '💪',
        subtitle: '넓은 어깨, 좁은 엉덩이',
        silhouette: { shoulder: 'wide', waist: 'medium', hip: 'narrow' },
        colorRules: { outer: 'dark', top: 'dark', bottom: 'light', shoes: 'any', summary: '상의 어둡게 · 하의 밝게' },
        bodyEffect: 'shoulder-narrow',
        female: {
            desc: '어깨·가슴이 넓고 하체가 상대적으로 가는 체형이에요. 하체에 볼륨을 주고 상체를 부드럽게 하면 균형이 잡혀요.',
            doList: [
                '딥 V넥·좁은 스쿱넥·U넥·비대칭 네크라인으로 어깨 좁아 보이게',
                '하의에 밝은 색·패턴 → 하체 볼륨업',
                '상의는 랩·엠파이어 웨이스트로 심플하게',
                'A라인·플리츠·튤립·볼미너스 스커트로 하체 강조',
                '와이드팬츠·부츠컷·보이프렌드핏으로 하체 볼륨',
                '벨트·랩자켓으로 허리 라인 정의',
                '래글런·키모노·돌먼 소매로 어깨 라인 완화'
            ],
            dontList: [
                '오프숄더·보트넥·스퀘어넥 → 어깨 더 넓어 보임',
                '어깨 패드·퍼프소매·어깨 장식',
                '상의에 밝은 색 + 하의에 어두운 색 (역효과)',
                '스키니진 단독 착용 (하체 더 가늘어 보임)',
                '상의 가로 줄무늬·큰 패턴'
            ],
        },
        male: {
            desc: '어깨가 넓고 상체가 발달한 체형이에요. 하체에 볼륨감을 주면 균형이 좋아져요.',
            doList: [
                'V넥으로 어깨 시각적 축소 & 세로라인 강조',
                '하의에 밝은 색 → 하체 볼륨 강조',
                '상의에 어두운 단색 → 어깨 시각적 축소',
                '카고 팬츠·와이드 팬츠로 하체 볼륨업',
                '래글런 소매로 어깨 라인 완화',
                '싱글브레스트·슬림 라펠 자켓',
                '스트레이트핏·부츠컷 팬츠'
            ],
            dontList: [
                '패드 있는 어깨, 퍼프 소매',
                '상의에 밝은 색 + 하의에 어두운 색 (역효과)',
                '보트넥 → 어깨 더 넓어 보임',
                '상의 가로 줄무늬',
                '스키니진 단독 (밸런스 깨짐)',
                '박시 티셔츠, 두꺼운 벌키 자켓'
            ],
        }
    },
    triangle: {
        name: '삼각형', emoji: '🔺', icon: '🍐',
        subtitle: '좁은 어깨, 넓은 엉덩이',
        silhouette: { shoulder: 'narrow', waist: 'medium', hip: 'wide' },
        colorRules: { outer: 'light', top: 'light', bottom: 'dark', shoes: 'dark', summary: '상의 밝게 · 하의 어둡게' },
        bodyEffect: 'shoulder-wide',
        female: {
            desc: '하체가 상체보다 넓은 체형이에요. 상체에 시선을 끌고 하체를 정리하면 전체 비율이 좋아져요.',
            doList: [
                '보트넥·오프숄더·스퀘어넥으로 어깨 라인 넓히기',
                '상의에 밝은 색·패턴·장식 → 시선을 위로',
                '어깨 패드가 있는 자켓·블레이저',
                'A라인·튤립·풀서클·바이어스컷 스커트',
                '하이웨스트 부츠컷·와이드레그·스트레이트 팬츠',
                '크롭 자켓·트렌치코트(허리 타이)',
                '랩 원피스·핏앤플레어 드레스'
            ],
            dontList: [
                '하체에 밝은 색이나 패턴·장식·포켓',
                '스키니진 단독 착용 (힙라인 강조)',
                '엉덩이 길이의 상의 (가장 넓은 부분 강조)',
                '하의 가로 줄무늬',
                '타이트한 펜슬스커트 (힙 강조)'
            ],
        },
        male: {
            desc: '하체가 상체보다 넓은 체형이에요. 상체에 포인트를 주면 전체 비율이 좋아져요.',
            doList: [
                '구조감 블레이저·숄더패드 자켓으로 어깨 넓히기',
                '상의에 밝은 색·패턴 → 시선을 위로',
                '가슴 디테일 (포켓, 에폴렛, 가로 줄무늬)',
                '하의는 어두운 단색으로 정리',
                '스트레이트핏·플랫프런트 팬츠',
                'V넥·크루넥 스웨터',
                '미디엄 라펠 싱글브레스트 자켓'
            ],
            dontList: [
                '비구조적 상의 (언스트럭처드 자켓 등)',
                '스키니 팬츠·타이트 하의',
                '하의에 밝은 색 + 상의에 어두운 색',
                '하체 가로 줄무늬',
                '배기 팬츠 (밸런스 안맞음)'
            ],
        }
    },
    rectangle: {
        name: '직사각형', emoji: '▬', icon: '📐',
        subtitle: '일자 실루엣, 비슷한 어깨·허리·엉덩이',
        silhouette: { shoulder: 'medium', waist: 'medium', hip: 'medium' },
        colorRules: { outer: 'any', top: 'light', bottom: 'dark', shoes: 'match-bottom', summary: '상·하의 색상 대비로 비율 만들기' },
        bodyEffect: 'none',
        female: {
            desc: '전체적으로 일자인 체형이에요. 허리 라인을 만들거나 곡선을 더하면 멋져요.',
            doList: [
                'V넥·스쿱넥·스위트하트넥으로 세로라인 & 곡선 연출',
                '랩탑·페플럼·벨트 블라우스로 허리 정의',
                '랩 원피스·핏앤플레어·벨트 드레스',
                'A라인·랩·비대칭 스커트',
                '하이웨스트 부츠컷·와이드레그 팬츠',
                '퍼프·플러터·벌룬 소매로 볼륨감',
                '텍스처 믹스 (니트+데님 등) 레이어링',
                '벨트로 허리 라인 강조 (슬림~미디엄 폭)'
            ],
            dontList: [
                '박시·루즈핏 단독 (라인이 더 안 보임)',
                '터틀넥·하이넥 (일자 강조)',
                '상하의 같은 색 일자 착용 (밋밋해 보임)',
                '허리에만 볼륨 (전체 밸런스 깨짐)',
                '쉐이플리스한 아이템 단독'
            ],
        },
        male: {
            desc: '전체적으로 일자인 체형이에요. 레이어링과 색상 대비로 입체감을 만들면 멋져요.',
            doList: [
                '레이어링으로 깊이감·입체감 만들기',
                '벨트나 턱인으로 허리 라인 강조',
                '상·하의 색상 대비로 비율 나누기',
                '텍스처 믹스 (니트+데님 등)',
                '자켓·가디건으로 세로 라인 만들기',
                '크루넥 티셔츠, V넥 스웨터',
                '구조감 블레이저 (숄더 패드)'
            ],
            dontList: [
                '상하의 같은 색 일자 착용 (밋밋해 보임)',
                '박시핏 단독 (라인이 더 안 보임)',
                '세로 줄무늬 (일자 더 강조)',
                '루즈핏 트라우저·와이드레그',
                '롱라인 탑·코트 (세로 일자 강조)',
                '플랫 쉐이플리스 셔츠'
            ],
        }
    },
    hourglass: {
        name: '모래시계', emoji: '⏳', icon: '✨',
        subtitle: '균형 잡힌 어깨·엉덩이, 잘록한 허리',
        silhouette: { shoulder: 'medium', waist: 'narrow', hip: 'medium' },
        colorRules: { outer: 'any', top: 'any', bottom: 'any', shoes: 'any', summary: '자유롭게! 허리 라인만 살리면 OK' },
        bodyEffect: 'none',
        female: {
            desc: '어깨와 엉덩이가 균형 잡히고 허리가 잘록한 체형이에요. 자연스러운 라인을 살리면 매우 멋져요.',
            doList: [
                '허리 라인을 살리는 핏 (턱인, 벨트, 랩)',
                'V넥·스쿱넥·스위트하트넥 (가슴 라인 자연스럽게)',
                '랩 원피스·핏앤플레어·벨트 드레스',
                '펜슬스커트 (곡선 살리기) or 풀스커트 (턱인)',
                '미디엄핏이 가장 잘 어울림',
                '드레이핑 소재 (저지, 실크, 코튼 블렌드)',
                '싱글브레스트·숏 자켓·벨트 코트'
            ],
            dontList: [
                '너무 박시한 오버핏 (라인이 숨음)',
                '너무 타이트한 전신 핏 (과함)',
                '허리를 안 드러내는 긴 아우터',
                '두꺼운 니트·청키 원단 (벌크업)',
                '더블브레스트, 드롭웨이스트',
                '두꺼운 벨트 (4.5cm 이상)'
            ],
        },
        male: {
            desc: '어깨와 엉덩이가 균형 잡히고 허리가 잘록한 체형이에요. 라인을 살리면 매우 멋져요.',
            doList: [
                '허리 라인을 살리는 핏 (턱인, 벨트)',
                '미디엄핏이 가장 잘 어울림',
                '단색 + 포인트 아이템 조합',
                '몸에 자연스럽게 떨어지는 소재',
                'V넥·크루넥 다 잘 어울림',
                '슬림핏 셔츠·하이웨스트 트라우저',
                '싱글브레스트 자켓 (허리 서프레션)',
                '미디엄 벨트 (대비색으로 포인트)'
            ],
            dontList: [
                '너무 박시한 오버핏 (라인이 숨음)',
                '너무 타이트한 전신 핏 (과함)',
                '로우라이즈 팬츠',
                '화려한 패턴·컬러',
                '오버사이즈 자켓·코트'
            ],
        }
    },
    round: {
        name: '원형', emoji: '⭕', icon: '🎯',
        subtitle: '복부 중심, 둥근 실루엣',
        silhouette: { shoulder: 'medium', waist: 'wide', hip: 'medium' },
        colorRules: { outer: 'dark', top: 'dark', middleware: 'dark', bottom: 'dark', shoes: 'match-bottom', summary: '전체 어두운 톤 · 세로 라인 강조' },
        bodyEffect: 'belly',
        female: {
            desc: '복부에 볼륨이 있는 체형이에요. 세로 라인을 만들고 네크라인·팔·다리에 시선을 주면 슬림해 보여요.',
            doList: [
                '딥 V넥·와이드 V·스쿱넥·카울넥으로 시선 분산',
                '엠파이어 웨이스트·랩 탑·플로이 드레이핑 상의',
                '엠파이어 웨이스트·A라인·랩·핏앤플레어 드레스',
                '3/4 소매로 팔 시각적 슬림 & 디테일 포인트',
                'A라인·플레어·니렝스+ 스커트',
                '하이웨스트 스트레이트·부츠컷 팬츠',
                '슬림 벨트를 바스트 아래 or 하이웨스트에 (토널 매칭)',
                '싱글브레스트·오픈형·구조감 자켓 (힙 길이+)',
                '잘 맞는 브라 필수 (실루엣 기초)'
            ],
            dontList: [
                '복부에 달라붙는 소재·타이트한 미드섹션',
                '허리 부분 가로 디테일·장식',
                '더블브레스트·크롭 자켓',
                '타이트 쇼츠',
                '밝은 색 상의 단독 (복부 강조)',
                '가로 줄무늬, 큰 패턴'
            ],
        },
        male: {
            desc: '복부에 볼륨이 있는 체형이에요. 세로 라인과 어두운 중심색으로 슬림하게 보여요.',
            doList: [
                '상의·미들웨어 어두운 색으로 중심 슬림',
                '세로 라인 강조 (오픈 자켓, 카디건)',
                '모노크롬 or 유사 톤 코디 → 세로 길어 보임',
                'V넥·깊은 라운드넥으로 시선 분산',
                '구조감 있는 자켓으로 실루엣 정리',
                '싱글브레스트·오픈 자켓',
                '스트레이트·약간 테이퍼드 팬츠'
            ],
            dontList: [
                '밝은 색 상의 단독 (복부 강조)',
                '가로 줄무늬, 큰 패턴',
                '짧은 기장 상의 (허리 라인 노출)',
                '너무 타이트한 핏',
                '더블브레스트 자켓',
                '플리츠·하이웨스트 팬츠',
                '컬러풀 벨트',
                '배기·오버사이즈 (벌크업)'
            ],
        }
    }
};

// 체형 진단 퀴즈 (5문항)
export const BODY_QUIZ_QUESTIONS = [
    {
        question: '어깨와 엉덩이 너비를 비교하면?',
        options: [
            { text: '어깨가 더 넓어요', scores: { inverted: 3 } },
            { text: '엉덩이가 더 넓어요', scores: { triangle: 3 } },
            { text: '비슷해요', scores: { rectangle: 1, hourglass: 1 } }
        ]
    },
    {
        question: '허리 라인은 어떤가요?',
        options: [
            { text: '허리가 잘록한 편이에요', scores: { hourglass: 3 } },
            { text: '허리와 엉덩이가 일자예요', scores: { rectangle: 3 } },
            { text: '배 부분이 나온 편이에요', scores: { round: 3 } }
        ]
    },
    {
        question: '상체와 하체 중 어디에 볼륨이 있나요?',
        options: [
            { text: '상체가 더 볼륨 있어요', scores: { inverted: 2, round: 1 } },
            { text: '하체가 더 볼륨 있어요', scores: { triangle: 2, hourglass: 1 } },
            { text: '비슷해요', scores: { rectangle: 2 } }
        ]
    },
    {
        question: '옷을 고를 때 가장 신경 쓰는 부분은?',
        options: [
            { text: '어깨가 넓어서 상의 핏이 걱정', scores: { inverted: 2 } },
            { text: '엉덩이·허벅지가 신경 쓰여요', scores: { triangle: 2 } },
            { text: '복부가 신경 쓰여요', scores: { round: 2 } },
            { text: '전체적으로 밋밋해 보여요', scores: { rectangle: 2 } },
            { text: '딱히 없어요 (균형 잡힌 편)', scores: { hourglass: 2 } }
        ]
    },
    {
        question: '가장 잘 어울리는 상의 핏은?',
        options: [
            { text: '슬림핏 (몸에 딱 맞는)', scores: { hourglass: 2, rectangle: 1 } },
            { text: '레귤러핏 (적당한)', scores: { inverted: 1, triangle: 1, hourglass: 1 } },
            { text: '오버핏 (넉넉한)', scores: { round: 2, triangle: 1 } }
        ]
    }
];

function outfitToHex(outfit) {
    var result = {};
    for (var part in outfit) {
        if (COLORS_60[outfit[part]]) {
            result[part] = COLORS_60[outfit[part]].hex;
        } else {
            result[part] = outfit[part];
        }
    }
    return result;
}

