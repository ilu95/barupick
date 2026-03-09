// @ts-nocheck
// ================================================================
// personalColor.ts — 퍼스널컬러 12계절 데이터
// 원본: 바루픽_최신본.html 4426~4756행
// ================================================================

export const PERSONAL_COLOR_12: Record<string, any> = {
  // ========== 봄 (Spring) - 웜톤 ==========
  spring_light: {
      name: '봄 라이트',
      season: 'spring',
      emoji: '🌸',
      description: '밝고 맑은 파스텔 웜톤이 잘 어울려요. 가볍고 화사한 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'ivory', 'cream', 'peach', 'pastel_peach', 'pastel_yellow', 'pastel_coral', 'salmon', 'apricot',
          // Good (전체 코디)
          'beige', 'pastel_mint', 'pastel_green', 'pastel_aqua', 'pastel_pink', 'pastel_lemon', 'coral', 'gold',
          // Accent (포인트)
          'lightgray', 'turquoise', 'white', 'pink'
      ],
      avoidColors: ['black', 'charcoal', 'dark_brown', 'burgundy', 'navy', 'dark_purple', 'midnight', 'espresso', 'dark_olive', 'dark_green', 'wine', 'maroon'],
      keywords: ['밝은', '맑은', '가벼운', '화사한']
  },
  spring_bright: {
      name: '봄 브라이트',
      season: 'spring',
      emoji: '🌷',
      description: '선명하고 화사한 비비드 웜톤이 잘 어울려요. 생기 넘치는 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'coral', 'orange', 'yellow', 'turquoise', 'aqua', 'lime', 'hot_pink', 'peach',
          // Good (전체 코디)
          'gold', 'pink', 'emerald', 'cyan', 'salmon', 'apricot', 'red', 'magenta',
          // Accent (포인트)
          'green', 'royal_blue', 'fuchsia', 'white'
      ],
      avoidColors: ['black', 'charcoal', 'gray', 'dark_brown', 'navy', 'burgundy', 'olive', 'taupe', 'dark_olive', 'espresso', 'wine', 'maroon'],
      keywords: ['선명한', '화사한', '생기있는', '비비드']
  },
  spring_true: {
      name: '봄 트루',
      season: 'spring',
      emoji: '🌻',
      description: '따뜻하고 맑은 중간 톤이 잘 어울려요. 자연스럽고 건강한 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'peach', 'coral', 'salmon', 'apricot', 'ivory', 'cream', 'camel', 'beige',
          // Good (전체 코디)
          'khaki', 'terracotta', 'orange', 'gold', 'brown', 'olive', 'yellow', 'pastel_peach',
          // Accent (포인트)
          'pastel_coral', 'lime', 'turquoise', 'emerald'
      ],
      avoidColors: ['black', 'cool_gray', 'charcoal', 'navy', 'dark_purple', 'burgundy', 'blue', 'silver', 'midnight', 'dark_blue', 'wine'],
      keywords: ['따뜻한', '맑은', '자연스러운', '건강한']
  },

  // ========== 여름 (Summer) - 쿨톤 ==========
  summer_light: {
      name: '여름 라이트',
      season: 'summer',
      emoji: '☁️',
      description: '밝고 부드러운 파스텔 쿨톤이 어울려요. 우아하고 여성스러운 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'pastel_pink', 'pastel_blue', 'pastel_lavender', 'pastel_rose', 'pastel_sky', 'pastel_lilac', 'white', 'ivory',
          // Good (전체 코디)
          'pastel_mint', 'lightgray', 'silver', 'pastel_purple', 'pastel_aqua', 'pastel_green', 'pastel_lemon', 'cream',
          // Accent (포인트)
          'dusty_pink', 'mauve', 'pastel_sage', 'cool_gray'
      ],
      avoidColors: ['black', 'orange', 'yellow', 'brown', 'camel', 'terracotta', 'olive', 'gold', 'dark_brown', 'burgundy', 'dark_olive'],
      keywords: ['부드러운', '연한', '우아한', '여성스러운']
  },
  summer_muted: {
      name: '여름 뮤트',
      season: 'summer',
      emoji: '🌫️',
      description: '차분하고 그레이시한 색상이 어울려요. 세련되고 품위있는 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'dusty_rose', 'dusty_pink', 'mauve', 'rose_brown', 'pastel_lavender', 'pastel_lilac', 'sage', 'pastel_sage',
          // Good (전체 코디)
          'slate', 'taupe', 'lightgray', 'cool_gray', 'gray', 'steel_blue', 'silver', 'plum',
          // Accent (포인트)
          'navy', 'teal', 'pastel_blue', 'dark_teal'
      ],
      avoidColors: ['orange', 'yellow', 'brown', 'black', 'white', 'red', 'gold', 'coral', 'bright_colors'],
      keywords: ['차분한', '그레이시', '세련된', '품위있는']
  },
  summer_true: {
      name: '여름 트루',
      season: 'summer',
      emoji: '🌊',
      description: '시원하고 부드러운 중간 쿨톤이 어울려요. 청량하고 깨끗한 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'pastel_blue', 'pastel_pink', 'pastel_lavender', 'pastel_lilac', 'pastel_sky', 'dusty_rose', 'dusty_pink', 'mauve',
          // Good (전체 코디)
          'steel_blue', 'silver', 'cool_gray', 'pastel_purple', 'slate', 'lightgray', 'pastel_aqua', 'pastel_mint',
          // Accent (포인트)
          'navy', 'teal', 'rose_brown', 'plum'
      ],
      avoidColors: ['orange', 'yellow', 'olive', 'camel', 'terracotta', 'gold', 'brown', 'coral', 'warm_colors'],
      keywords: ['시원한', '부드러운', '청량한', '깨끗한']
  },

  // ========== 가을 (Autumn) - 웜톤 ==========
  autumn_soft: {
      name: '가을 소프트',
      season: 'autumn',
      emoji: '🍂',
      description: '부드럽고 따뜻한 뮤트 톤이 어울려요. 내추럴하고 편안한 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'camel', 'beige', 'cream', 'ivory', 'dusty_pink', 'dusty_rose', 'peach', 'apricot',
          // Good (전체 코디)
          'sage', 'taupe', 'olive', 'khaki', 'brown', 'rose_brown', 'pastel_sage', 'salmon',
          // Accent (포인트)
          'terracotta', 'coral', 'gold', 'pastel_peach'
      ],
      avoidColors: ['black', 'white', 'royal_blue', 'hot_pink', 'silver', 'navy', 'magenta', 'fuchsia', 'bright_colors'],
      keywords: ['부드러운', '뮤트한', '내추럴', '편안한']
  },
  autumn_deep: {
      name: '가을 딥',
      season: 'autumn',
      emoji: '🍁',
      description: '깊고 풍부한 어스톤이 어울려요. 고급스럽고 중후한 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'burgundy', 'wine', 'terracotta', 'chocolate', 'dark_brown', 'forest', 'dark_olive', 'espresso',
          // Good (전체 코디)
          'maroon', 'dark_green', 'indigo', 'plum', 'navy', 'dark_teal', 'dark_purple', 'brown',
          // Accent (포인트)
          'olive', 'teal', 'dark_red', 'slate'
      ],
      avoidColors: ['pastel_pink', 'pastel_blue', 'silver', 'white', 'pastel_lavender', 'pastel_yellow', 'bright_colors'],
      keywords: ['깊은', '풍부한', '고급스러운', '중후한']
  },
  autumn_true: {
      name: '가을 트루',
      season: 'autumn',
      emoji: '🎃',
      description: '따뜻하고 자연스러운 어스톤이 어울려요. 클래식하고 안정적인 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'camel', 'terracotta', 'brown', 'olive', 'khaki', 'beige', 'coral', 'salmon',
          // Good (전체 코디)
          'gold', 'forest', 'orange', 'dark_olive', 'dark_brown', 'burgundy', 'cream', 'teal',
          // Accent (포인트)
          'dark_green', 'chocolate', 'wine', 'taupe'
      ],
      avoidColors: ['black', 'blue', 'silver', 'pastel_pink', 'pastel_blue', 'gray', 'white', 'navy', 'cool_colors'],
      keywords: ['따뜻한', '자연스러운', '클래식', '안정적인']
  },

  // ========== 겨울 (Winter) - 쿨톤 ==========
  winter_bright: {
      name: '겨울 브라이트',
      season: 'winter',
      emoji: '✨',
      description: '선명하고 차가운 비비드 톤이 어울려요. 강렬하고 시선을 끄는 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'red', 'hot_pink', 'magenta', 'fuchsia', 'royal_blue', 'emerald', 'turquoise', 'white',
          // Good (전체 코디)
          'pink', 'cyan', 'purple', 'yellow', 'lime', 'green', 'blue', 'black',
          // Accent (포인트)
          'navy', 'silver', 'coral', 'aqua'
      ],
      avoidColors: ['beige', 'orange', 'olive', 'camel', 'taupe', 'brown', 'dusty_rose', 'dusty_pink', 'muted_colors'],
      keywords: ['선명한', '비비드', '강렬한', '시선을끄는']
  },
  winter_deep: {
      name: '겨울 딥',
      season: 'winter',
      emoji: '🌙',
      description: '깊고 진한 다크 톤이 어울려요. 시크하고 세련된 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'black', 'navy', 'dark_purple', 'burgundy', 'dark_red', 'charcoal', 'midnight', 'wine',
          // Good (전체 코디)
          'forest', 'dark_green', 'espresso', 'indigo', 'dark_blue', 'dark_teal', 'dark_olive', 'plum',
          // Accent (포인트)
          'maroon', 'chocolate', 'slate', 'teal'
      ],
      avoidColors: ['pastel_pink', 'beige', 'orange', 'cream', 'ivory', 'camel', 'pastel_peach', 'pastel_yellow', 'light_colors'],
      keywords: ['깊은', '시크한', '세련된', '모던한']
  },
  winter_true: {
      name: '겨울 트루',
      season: 'winter',
      emoji: '❄️',
      description: '차갑고 선명한 대비가 강한 색상이 어울려요. 모던하고 도시적인 느낌의 색상을 추천드려요.',
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'black', 'white', 'red', 'royal_blue', 'emerald', 'magenta', 'hot_pink', 'navy',
          // Good (전체 코디)
          'purple', 'pink', 'charcoal', 'turquoise', 'cyan', 'blue', 'fuchsia', 'silver',
          // Accent (포인트)
          'gray', 'dark_purple', 'dark_blue', 'green'
      ],
      avoidColors: ['beige', 'camel', 'olive', 'orange', 'brown', 'taupe', 'cream', 'dusty_pink', 'warm_muted_colors'],
      keywords: ['대비', '선명한', '모던', '도시적인']
  }
        };

        // 계절별 그룹핑 (UI용)
        const PERSONAL_COLOR_SEASONS = {
  spring: {
      name: '봄 웜톤',
      emoji: '🌸',
      types: ['spring_light', 'spring_bright', 'spring_true']
  },
  summer: {
      name: '여름 쿨톤',
      emoji: '🌊',
      types: ['summer_light', 'summer_muted', 'summer_true']
  },
  autumn: {
      name: '가을 웜톤',
      emoji: '🍂',
      types: ['autumn_soft', 'autumn_deep', 'autumn_true']
  },
  winter: {
      name: '겨울 쿨톤',
      emoji: '❄️',
      types: ['winter_bright', 'winter_deep', 'winter_true']
  }
        };

        export const PERSONAL_COLOR_DIAGNOSIS = {
  questions: [
      {
          id: 1,
          question: "손목 안쪽 혈관 색은 어떤가요?",
          options: [
              { text: "초록빛이 강해요", score: { warm: 2, cool: 0 } },
              { text: "파란빛/보라빛이 강해요", score: { warm: 0, cool: 2 } },
              { text: "둘 다 비슷하게 보여요", score: { warm: 1, cool: 1 } }
          ]
      },
      {
          id: 2,
          question: "햇빛에 피부가 어떻게 반응하나요?",
          options: [
              { text: "쉽게 타고 붉어져요", score: { warm: 0, cool: 2 } },
              { text: "잘 타고 갈색으로 변해요", score: { warm: 2, cool: 0 } },
              { text: "적당히 타는 편이에요", score: { warm: 1, cool: 1 } }
          ]
      },
      {
          id: 3,
          question: "금/은 액세서리 중 더 어울리는 것은?",
          options: [
              { text: "골드가 더 어울려요", score: { warm: 2, cool: 0 } },
              { text: "실버가 더 어울려요", score: { warm: 0, cool: 2 } },
              { text: "둘 다 비슷하게 어울려요", score: { warm: 1, cool: 1 } }
          ]
      },
      {
          id: 4,
          question: "흰 옷을 입었을 때 더 어울리는 것은?",
          options: [
              { text: "아이보리/크림색이 더 좋아요", score: { warm: 2, cool: 0, spring: 1, autumn: 1 } },
              { text: "순백색/푸른 흰색이 더 좋아요", score: { warm: 0, cool: 2, summer: 1, winter: 1 } },
              { text: "둘 다 괜찮아요", score: { warm: 1, cool: 1 } }
          ]
      },
      {
          id: 5,
          question: "눈동자와 머리카락 색은 어떤가요?",
          options: [
              { text: "밝은 갈색/연한 색이에요", score: { light: 2, bright: 1 } },
              { text: "중간 톤의 갈색이에요", score: { true: 2, soft: 1 } },
              { text: "진한 갈색/검정색이에요", score: { deep: 2, true: 1 } }
          ]
      },
      {
          id: 6,
          question: "전체적인 이미지/인상은 어떤 편인가요?",
          options: [
              { text: "밝고 화사한 느낌이에요", score: { spring: 2, light: 1, bright: 1 } },
              { text: "부드럽고 은은한 느낌이에요", score: { summer: 2, soft: 1, muted: 1 } },
              { text: "차분하고 깊은 느낌이에요", score: { autumn: 2, deep: 1, soft: 1 } },
              { text: "선명하고 또렷한 느낌이에요", score: { winter: 2, bright: 1, true: 1 } }
          ]
      },
      {
          id: 7,
          question: "선명한 원색 vs 차분한 뮤트 색, 더 어울리는 것은?",
          options: [
              { text: "선명하고 비비드한 색이 어울려요", score: { bright: 2, true: 1 } },
              { text: "차분하고 뮤트한 색이 어울려요", score: { muted: 2, soft: 2 } },
              { text: "둘 다 비슷해요", score: { true: 1, soft: 1 } }
          ]
      },
      {
          id: 8,
          question: "피부 톤의 대비감은 어떤가요? (눈동자, 머리카락, 피부 간의 차이)",
          options: [
              { text: "대비가 약하고 전체적으로 비슷해요", score: { light: 2, soft: 1, muted: 1 } },
              { text: "중간 정도의 대비예요", score: { true: 2, soft: 1 } },
              { text: "대비가 강하고 또렷해요", score: { deep: 2, bright: 1, winter: 1 } }
          ]
      }
  ],
  // 기존 4계절 결과 (하위 호환용)
  results: {
      spring_warm: {
          name: '봄 웜톤',
          emoji: '🌸',
          description: '따뜻하고 밝은 색상이 잘 어울려요. 피치, 코랄, 밝은 오렌지, 연한 노랑 등 화사한 색상을 추천드려요.',
          colors: ['pastel_peach', 'coral', 'pastel_yellow', 'cream', 'ivory', 'camel', 'beige']
      },
      summer_cool: {
          name: '여름 쿨톤',
          emoji: '🌊',
          description: '차갑고 부드러운 색상이 잘 어울려요. 라벤더, 로즈, 스카이블루, 민트 등 파스텔 쿨톤을 추천드려요.',
          colors: ['pastel_lavender', 'pastel_rose', 'pastel_sky', 'pastel_mint', 'pastel_blue', 'slate', 'lightgray']
      },
      autumn_warm: {
          name: '가을 웜톤',
          emoji: '🍂',
          description: '따뜻하고 깊은 색상이 잘 어울려요. 카멜, 버건디, 올리브, 머스타드 등 가을 느낌의 색상을 추천드려요.',
          colors: ['camel', 'burgundy', 'olive', 'brown', 'khaki', 'dark_olive', 'wine']
      },
      winter_cool: {
          name: '겨울 쿨톤',
          emoji: '❄️',
          description: '차갑고 선명한 색상이 잘 어울려요. 블랙, 화이트, 네이비, 로얄블루 등 대비가 강한 색상을 추천드려요.',
          colors: ['black', 'white', 'navy', 'royal_blue', 'dark_purple', 'charcoal', 'midnight']
      }
  }
}

export const FACE_NEAR_ITEMS = ["outer", "middleware", "top", "scarf", "hat"] as const
