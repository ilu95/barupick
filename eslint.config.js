import tseslint from 'typescript-eslint';
import i18next from 'eslint-plugin-i18next';

export default [
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['warn', {
        markupOnly: true,
        ignoreAttribute: [
          'className', 'class', 'key', 'id', 'name', 'type', 'href', 'src',
          'alt', 'role', 'htmlFor', 'target', 'rel', 'data-testid', 'fill',
          'stroke', 'viewBox', 'd', 'xmlns', 'cx', 'cy', 'r', 'rx', 'ry',
          'x1', 'x2', 'y1', 'y2', 'width', 'height', 'transform',
          'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'clipPath',
          'gradientUnits', 'offset', 'stopColor', 'stopOpacity',
          'fillRule', 'clipRule',
        ],
      }],
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
];
