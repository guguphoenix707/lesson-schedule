import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'design'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'all',
          caughtErrors: 'all',
          ignoreRestSiblings: false,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportDeclaration[importKind!="type"] ImportSpecifier[importKind="type"]',
          message:
            'Use a separate `import type { ... }` statement instead of mixing inline `type` specifiers with value imports.',
        },
        {
          selector:
            'CallExpression[callee.property.name=/^(map|filter|forEach|find|some|every|reduce|flatMap|join)$/]',
          message:
            'Use lodash-es iteratees such as map(list, fn) or join(list, sep); native list.map throws on null/undefined.',
        },
        {
          selector: 'JSXAttribute UnaryExpression[operator="void"]',
          message:
            'Do not hide Promise handling in JSX with void; await the operation and handle failures at the action boundary.',
        },
      ],
      'object-shorthand': ['error', 'always'],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: {
            array: false,
            object: true,
          },
          AssignmentExpression: {
            array: false,
            object: true,
          },
        },
      ],
    },
  },
);

