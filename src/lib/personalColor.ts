// @ts-nocheck
// ================================================================
// personalColor.ts — 퍼스널컬러 12계절 데이터
// 원본: 바루픽_최신본.html 4426~4756행
// ================================================================

import i18n from '@/i18n'

export const PERSONAL_COLOR_12: Record<string, any> = {
  // ========== 봄 (Spring) - 웜톤 ==========
  spring_light: {
      get name() { return i18n.t('personalColor:types.spring_light.name') },
      season: 'spring',
      emoji: '🌸',
      get description() { return i18n.t('personalColor:types.spring_light.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'ivory', 'cream', 'peach', 'pastel_peach', 'pastel_yellow', 'pastel_coral', 'salmon', 'apricot',
          // Good (전체 코디)
          'beige', 'pastel_mint', 'pastel_green', 'pastel_aqua', 'pastel_pink', 'pastel_lemon', 'coral', 'gold',
          // Accent (포인트)
          'lightgray', 'turquoise', 'white', 'pink'
      ],
      avoidColors: ['black', 'charcoal', 'dark_brown', 'burgundy', 'navy', 'dark_purple', 'midnight', 'espresso', 'dark_olive', 'dark_green', 'wine', 'maroon'],
      get keywords() { return i18n.t('personalColor:types.spring_light.keywords', { returnObjects: true }) as string[] }
  },
  spring_bright: {
      get name() { return i18n.t('personalColor:types.spring_bright.name') },
      season: 'spring',
      emoji: '🌷',
      get description() { return i18n.t('personalColor:types.spring_bright.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'coral', 'orange', 'yellow', 'turquoise', 'aqua', 'lime', 'hot_pink', 'peach',
          // Good (전체 코디)
          'gold', 'pink', 'emerald', 'cyan', 'salmon', 'apricot', 'red', 'magenta',
          // Accent (포인트)
          'green', 'royal_blue', 'fuchsia', 'white'
      ],
      avoidColors: ['black', 'charcoal', 'gray', 'dark_brown', 'navy', 'burgundy', 'olive', 'taupe', 'dark_olive', 'espresso', 'wine', 'maroon'],
      get keywords() { return i18n.t('personalColor:types.spring_bright.keywords', { returnObjects: true }) as string[] }
  },
  spring_true: {
      get name() { return i18n.t('personalColor:types.spring_true.name') },
      season: 'spring',
      emoji: '🌻',
      get description() { return i18n.t('personalColor:types.spring_true.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'peach', 'coral', 'salmon', 'apricot', 'ivory', 'cream', 'camel', 'beige',
          // Good (전체 코디)
          'khaki', 'terracotta', 'orange', 'gold', 'brown', 'olive', 'yellow', 'pastel_peach',
          // Accent (포인트)
          'pastel_coral', 'lime', 'turquoise', 'emerald'
      ],
      avoidColors: ['black', 'cool_gray', 'charcoal', 'navy', 'dark_purple', 'burgundy', 'blue', 'silver', 'midnight', 'dark_blue', 'wine'],
      get keywords() { return i18n.t('personalColor:types.spring_true.keywords', { returnObjects: true }) as string[] }
  },

  // ========== 여름 (Summer) - 쿨톤 ==========
  summer_light: {
      get name() { return i18n.t('personalColor:types.summer_light.name') },
      season: 'summer',
      emoji: '☁️',
      get description() { return i18n.t('personalColor:types.summer_light.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'pastel_pink', 'pastel_blue', 'pastel_lavender', 'pastel_rose', 'pastel_sky', 'pastel_lilac', 'white', 'ivory',
          // Good (전체 코디)
          'pastel_mint', 'lightgray', 'silver', 'pastel_purple', 'pastel_aqua', 'pastel_green', 'pastel_lemon', 'cream',
          // Accent (포인트)
          'dusty_pink', 'mauve', 'pastel_sage', 'cool_gray'
      ],
      avoidColors: ['black', 'orange', 'yellow', 'brown', 'camel', 'terracotta', 'olive', 'gold', 'dark_brown', 'burgundy', 'dark_olive'],
      get keywords() { return i18n.t('personalColor:types.summer_light.keywords', { returnObjects: true }) as string[] }
  },
  summer_muted: {
      get name() { return i18n.t('personalColor:types.summer_muted.name') },
      season: 'summer',
      emoji: '🌫️',
      get description() { return i18n.t('personalColor:types.summer_muted.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'dusty_rose', 'dusty_pink', 'mauve', 'rose_brown', 'pastel_lavender', 'pastel_lilac', 'sage', 'pastel_sage',
          // Good (전체 코디)
          'slate', 'taupe', 'lightgray', 'cool_gray', 'gray', 'steel_blue', 'silver', 'plum',
          // Accent (포인트)
          'navy', 'teal', 'pastel_blue', 'dark_teal'
      ],
      avoidColors: ['orange', 'yellow', 'brown', 'black', 'white', 'red', 'gold', 'coral', 'bright_colors'],
      get keywords() { return i18n.t('personalColor:types.summer_muted.keywords', { returnObjects: true }) as string[] }
  },
  summer_true: {
      get name() { return i18n.t('personalColor:types.summer_true.name') },
      season: 'summer',
      emoji: '🌊',
      get description() { return i18n.t('personalColor:types.summer_true.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'pastel_blue', 'pastel_pink', 'pastel_lavender', 'pastel_lilac', 'pastel_sky', 'dusty_rose', 'dusty_pink', 'mauve',
          // Good (전체 코디)
          'steel_blue', 'silver', 'cool_gray', 'pastel_purple', 'slate', 'lightgray', 'pastel_aqua', 'pastel_mint',
          // Accent (포인트)
          'navy', 'teal', 'rose_brown', 'plum'
      ],
      avoidColors: ['orange', 'yellow', 'olive', 'camel', 'terracotta', 'gold', 'brown', 'coral', 'warm_colors'],
      get keywords() { return i18n.t('personalColor:types.summer_true.keywords', { returnObjects: true }) as string[] }
  },

  // ========== 가을 (Autumn) - 웜톤 ==========
  autumn_soft: {
      get name() { return i18n.t('personalColor:types.autumn_soft.name') },
      season: 'autumn',
      emoji: '🍂',
      get description() { return i18n.t('personalColor:types.autumn_soft.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'camel', 'beige', 'cream', 'ivory', 'dusty_pink', 'dusty_rose', 'peach', 'apricot',
          // Good (전체 코디)
          'sage', 'taupe', 'olive', 'khaki', 'brown', 'rose_brown', 'pastel_sage', 'salmon',
          // Accent (포인트)
          'terracotta', 'coral', 'gold', 'pastel_peach'
      ],
      avoidColors: ['black', 'white', 'royal_blue', 'hot_pink', 'silver', 'navy', 'magenta', 'fuchsia', 'bright_colors'],
      get keywords() { return i18n.t('personalColor:types.autumn_soft.keywords', { returnObjects: true }) as string[] }
  },
  autumn_deep: {
      get name() { return i18n.t('personalColor:types.autumn_deep.name') },
      season: 'autumn',
      emoji: '🍁',
      get description() { return i18n.t('personalColor:types.autumn_deep.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'burgundy', 'wine', 'terracotta', 'chocolate', 'dark_brown', 'forest', 'dark_olive', 'espresso',
          // Good (전체 코디)
          'maroon', 'dark_green', 'indigo', 'plum', 'navy', 'dark_teal', 'dark_purple', 'brown',
          // Accent (포인트)
          'olive', 'teal', 'dark_red', 'slate'
      ],
      avoidColors: ['pastel_pink', 'pastel_blue', 'silver', 'white', 'pastel_lavender', 'pastel_yellow', 'bright_colors'],
      get keywords() { return i18n.t('personalColor:types.autumn_deep.keywords', { returnObjects: true }) as string[] }
  },
  autumn_true: {
      get name() { return i18n.t('personalColor:types.autumn_true.name') },
      season: 'autumn',
      emoji: '🎃',
      get description() { return i18n.t('personalColor:types.autumn_true.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'camel', 'terracotta', 'brown', 'olive', 'khaki', 'beige', 'coral', 'salmon',
          // Good (전체 코디)
          'gold', 'forest', 'orange', 'dark_olive', 'dark_brown', 'burgundy', 'cream', 'teal',
          // Accent (포인트)
          'dark_green', 'chocolate', 'wine', 'taupe'
      ],
      avoidColors: ['black', 'blue', 'silver', 'pastel_pink', 'pastel_blue', 'gray', 'white', 'navy', 'cool_colors'],
      get keywords() { return i18n.t('personalColor:types.autumn_true.keywords', { returnObjects: true }) as string[] }
  },

  // ========== 겨울 (Winter) - 쿨톤 ==========
  winter_bright: {
      get name() { return i18n.t('personalColor:types.winter_bright.name') },
      season: 'winter',
      emoji: '✨',
      get description() { return i18n.t('personalColor:types.winter_bright.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'red', 'hot_pink', 'magenta', 'fuchsia', 'royal_blue', 'emerald', 'turquoise', 'white',
          // Good (전체 코디)
          'pink', 'cyan', 'purple', 'yellow', 'lime', 'green', 'blue', 'black',
          // Accent (포인트)
          'navy', 'silver', 'coral', 'aqua'
      ],
      avoidColors: ['beige', 'orange', 'olive', 'camel', 'taupe', 'brown', 'dusty_rose', 'dusty_pink', 'muted_colors'],
      get keywords() { return i18n.t('personalColor:types.winter_bright.keywords', { returnObjects: true }) as string[] }
  },
  winter_deep: {
      get name() { return i18n.t('personalColor:types.winter_deep.name') },
      season: 'winter',
      emoji: '🌙',
      get description() { return i18n.t('personalColor:types.winter_deep.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'black', 'navy', 'dark_purple', 'burgundy', 'dark_red', 'charcoal', 'midnight', 'wine',
          // Good (전체 코디)
          'forest', 'dark_green', 'espresso', 'indigo', 'dark_blue', 'dark_teal', 'dark_olive', 'plum',
          // Accent (포인트)
          'maroon', 'chocolate', 'slate', 'teal'
      ],
      avoidColors: ['pastel_pink', 'beige', 'orange', 'cream', 'ivory', 'camel', 'pastel_peach', 'pastel_yellow', 'light_colors'],
      get keywords() { return i18n.t('personalColor:types.winter_deep.keywords', { returnObjects: true }) as string[] }
  },
  winter_true: {
      get name() { return i18n.t('personalColor:types.winter_true.name') },
      season: 'winter',
      emoji: '❄️',
      get description() { return i18n.t('personalColor:types.winter_true.description') },
      bestColors: [
          // 핵심 Best (얼굴 근처)
          'black', 'white', 'red', 'royal_blue', 'emerald', 'magenta', 'hot_pink', 'navy',
          // Good (전체 코디)
          'purple', 'pink', 'charcoal', 'turquoise', 'cyan', 'blue', 'fuchsia', 'silver',
          // Accent (포인트)
          'gray', 'dark_purple', 'dark_blue', 'green'
      ],
      avoidColors: ['beige', 'camel', 'olive', 'orange', 'brown', 'taupe', 'cream', 'dusty_pink', 'warm_muted_colors'],
      get keywords() { return i18n.t('personalColor:types.winter_true.keywords', { returnObjects: true }) as string[] }
  }
        };

        // 계절별 그룹핑 (UI용)
        const PERSONAL_COLOR_SEASONS = {
  spring: {
      get name() { return i18n.t('personalColor:seasons.spring.name') },
      emoji: '🌸',
      types: ['spring_light', 'spring_bright', 'spring_true']
  },
  summer: {
      get name() { return i18n.t('personalColor:seasons.summer.name') },
      emoji: '🌊',
      types: ['summer_light', 'summer_muted', 'summer_true']
  },
  autumn: {
      get name() { return i18n.t('personalColor:seasons.autumn.name') },
      emoji: '🍂',
      types: ['autumn_soft', 'autumn_deep', 'autumn_true']
  },
  winter: {
      get name() { return i18n.t('personalColor:seasons.winter.name') },
      emoji: '❄️',
      types: ['winter_bright', 'winter_deep', 'winter_true']
  }
        };

        export const PERSONAL_COLOR_DIAGNOSIS = {
  questions: [
      {
          id: 1,
          get question() { return i18n.t('personalColor:diagnosis.questions.0.question') },
          options: [
              { get text() { return i18n.t('personalColor:diagnosis.questions.0.options.0') }, score: { warm: 2, cool: 0 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.0.options.1') }, score: { warm: 0, cool: 2 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.0.options.2') }, score: { warm: 1, cool: 1 } }
          ]
      },
      {
          id: 2,
          get question() { return i18n.t('personalColor:diagnosis.questions.1.question') },
          options: [
              { get text() { return i18n.t('personalColor:diagnosis.questions.1.options.0') }, score: { warm: 0, cool: 2 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.1.options.1') }, score: { warm: 2, cool: 0 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.1.options.2') }, score: { warm: 1, cool: 1 } }
          ]
      },
      {
          id: 3,
          get question() { return i18n.t('personalColor:diagnosis.questions.2.question') },
          options: [
              { get text() { return i18n.t('personalColor:diagnosis.questions.2.options.0') }, score: { warm: 2, cool: 0 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.2.options.1') }, score: { warm: 0, cool: 2 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.2.options.2') }, score: { warm: 1, cool: 1 } }
          ]
      },
      {
          id: 4,
          get question() { return i18n.t('personalColor:diagnosis.questions.3.question') },
          options: [
              { get text() { return i18n.t('personalColor:diagnosis.questions.3.options.0') }, score: { warm: 2, cool: 0, spring: 1, autumn: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.3.options.1') }, score: { warm: 0, cool: 2, summer: 1, winter: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.3.options.2') }, score: { warm: 1, cool: 1 } }
          ]
      },
      {
          id: 5,
          get question() { return i18n.t('personalColor:diagnosis.questions.4.question') },
          options: [
              { get text() { return i18n.t('personalColor:diagnosis.questions.4.options.0') }, score: { light: 2, bright: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.4.options.1') }, score: { true: 2, soft: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.4.options.2') }, score: { deep: 2, true: 1 } }
          ]
      },
      {
          id: 6,
          get question() { return i18n.t('personalColor:diagnosis.questions.5.question') },
          options: [
              { get text() { return i18n.t('personalColor:diagnosis.questions.5.options.0') }, score: { spring: 2, light: 1, bright: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.5.options.1') }, score: { summer: 2, soft: 1, muted: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.5.options.2') }, score: { autumn: 2, deep: 1, soft: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.5.options.3') }, score: { winter: 2, bright: 1, true: 1 } }
          ]
      },
      {
          id: 7,
          get question() { return i18n.t('personalColor:diagnosis.questions.6.question') },
          options: [
              { get text() { return i18n.t('personalColor:diagnosis.questions.6.options.0') }, score: { bright: 2, true: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.6.options.1') }, score: { muted: 2, soft: 2 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.6.options.2') }, score: { true: 1, soft: 1 } }
          ]
      },
      {
          id: 8,
          get question() { return i18n.t('personalColor:diagnosis.questions.7.question') },
          options: [
              { get text() { return i18n.t('personalColor:diagnosis.questions.7.options.0') }, score: { light: 2, soft: 1, muted: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.7.options.1') }, score: { true: 2, soft: 1 } },
              { get text() { return i18n.t('personalColor:diagnosis.questions.7.options.2') }, score: { deep: 2, bright: 1, winter: 1 } }
          ]
      }
  ],
  // 기존 4계절 결과 (하위 호환용)
  results: {
      spring_warm: {
          get name() { return i18n.t('personalColor:diagnosis.results.spring_warm.name') },
          emoji: '🌸',
          get description() { return i18n.t('personalColor:diagnosis.results.spring_warm.description') },
          colors: ['pastel_peach', 'coral', 'pastel_yellow', 'cream', 'ivory', 'camel', 'beige']
      },
      summer_cool: {
          get name() { return i18n.t('personalColor:diagnosis.results.summer_cool.name') },
          emoji: '🌊',
          get description() { return i18n.t('personalColor:diagnosis.results.summer_cool.description') },
          colors: ['pastel_lavender', 'pastel_rose', 'pastel_sky', 'pastel_mint', 'pastel_blue', 'slate', 'lightgray']
      },
      autumn_warm: {
          get name() { return i18n.t('personalColor:diagnosis.results.autumn_warm.name') },
          emoji: '🍂',
          get description() { return i18n.t('personalColor:diagnosis.results.autumn_warm.description') },
          colors: ['camel', 'burgundy', 'olive', 'brown', 'khaki', 'dark_olive', 'wine']
      },
      winter_cool: {
          get name() { return i18n.t('personalColor:diagnosis.results.winter_cool.name') },
          emoji: '❄️',
          get description() { return i18n.t('personalColor:diagnosis.results.winter_cool.description') },
          colors: ['black', 'white', 'navy', 'royal_blue', 'dark_purple', 'charcoal', 'midnight']
      }
  }
}

export const FACE_NEAR_ITEMS = ["outer", "middleware", "top", "scarf", "hat"] as const
