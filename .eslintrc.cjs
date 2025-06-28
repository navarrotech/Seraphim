// Copyright © 2024 Jalapeno Labs

// This is the recommende ESLint configuration
// Based on rules and experience from the Google typescript style guide
// https://google.github.io/styleguide/tsguide.html#exports

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'google',
  ],
  ignorePatterns: [
    'dist',
    'vite-env.d.ts',
    '.eslintrc.cjs',
    '*.config.ts',
    'node_modules',
    '.json'
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    'react-refresh',
    'header',
    '@stylistic/js',
    'import',
    'i18next'
  ],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true
    },
    'react': {
      version: 'detect'
    }
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    //////////////////////////////////////////
    // Typescript rules:

    // Allow any https://typescript-eslint.io/rules/no-explicit-any/
    '@typescript-eslint/no-explicit-any': 'off',

    // Allow ts-ignore https://typescript-eslint.io/rules/ban-ts-comment/
    '@typescript-eslint/ban-ts-comment': 'off',

    // Allow banned types https://typescript-eslint.io/rules/ban-types/
    '@typescript-eslint/ban-types': 'off',

    //////////////////////////////////////////
    // Enforcing internationalization

    // No literal strings https://www.npmjs.com/package/eslint-plugin-i18next
    'i18next/no-literal-string': 'error',

    //////////////////////////////////////////
    // Enforcing consistency

    // Enforce consistent return https://eslint.org/docs/latest/rules/consistent-return
    'consistent-return': 'error',

    // Enforce no duplicate imports https://eslint.org/docs/latest/rules/no-extraneous-dependencies
    'import/no-extraneous-dependencies': [
      'off',
    ],
    // Disable guard-for-in https://eslint.org/docs/latest/rules/guard-for-in
    // This is enabled by default in the google style guide, but we're disabling it
    'guard-for-in': 'off',

    // Enforce no duplicate imports https://eslint.org/docs/latest/rules/no-duplicate-imports
    'no-useless-return': 'error',

    // Enforce no unreachable code https://eslint.org/docs/latest/rules/no-unreachable
    'no-unreachable': 'error',

    // Enforce single quotes https://eslint.org/docs/latest/rules/quotes
    quotes: ['error', 'single'],

    // Enforce single quotes in JSX https://eslint.org/docs/latest/rules/jsx-quotes
    'jsx-quotes': ['error', 'prefer-single'],

    // Enforce 2 spaces https://eslint.org/docs/latest/rules/indent
    indent: ['error', 2],

    // Enforce no comma dangling https://eslint.org/docs/latest/rules/comma-dangle
    'comma-dangle': ['error', 'never'],

    // Camel case! https://eslint.org/docs/latest/rules/camelcase
    camelcase: 'warn',

    // No unused vars https://eslint.org/docs/latest/rules/no-unused-vars
    // We disable this, because we're using the typescript version which is friendly with types being used/unused :)
    'no-unused-vars': 'off',

    // https://stackoverflow.com/a/61555310/9951599
    '@typescript-eslint/no-unused-vars': ['error'],

    // No useless escape https://eslint.org/docs/latest/rules/no-useless-escape
    'no-useless-escape': 'error',

    // Disable vars https://eslint.org/docs/latest/rules/no-var
    'no-var': 'error',

    // Disable yoda https://eslint.org/docs/latest/rules/yoda
    yoda: 'error',

    // Disable semi colons https://eslint.org/docs/latest/rules/semi
    semi: ['error', 'never'],

    // Disable no multi spaces https://eslint.org/docs/latest/rules/no-multi-spaces
    'operator-linebreak': ['error', 'before'],

    // Ensure that we're using curly braces for all lines https://eslint.org/docs/latest/rules/curly
    'curly': ['error', 'all'],

    // No single-line magic: https://eslint.org/docs/latest/rules/brace-style
    'brace-style': ['error', 'stroustrup', { 'allowSingleLine': false }],

    // End of line https://eslint.style/packages/js
    // Depreciated original package: (https://eslint.org/docs/latest/rules/eol-last)
    '@stylistic/js/eol-last': ['error', 'always'],

    // Enforce spacing https://eslint.org/docs/latest/rules/keyword-spacing
    'keyword-spacing': ['error', { before: true, after: true }],

    // Array and object spacing https://eslint.org/docs/latest/rules/array-bracket-spacing
    'array-bracket-spacing': [
      'error',
      'always',
      {
        objectsInArrays: false,
        arraysInArrays: false,
      },
    ],

    // Object curly spacing https://eslint.org/docs/latest/rules/object-curly-spacing
    'object-curly-spacing': [
      'error',
      'always',
      {
        objectsInObjects: false,
        arraysInObjects: false,
      },
    ],

    //////////////////////////////////////////
    // Import/export rules

    // Disable default exports https://eslint.org/docs/latest/rules/no-default-export
    // Google style guide: https://google.github.io/styleguide/tsguide.html#exports
    'import/no-default-export': 'error',

    // https://eslint.org/docs/latest/rules/no-restricted-exports
    'no-restricted-exports': [
      'error',
      {
        restrictedNamedExports: ['default',],
      },
    ],

    //////////////////////////////////////////
    // Warnings & Grey areas

    // We're using this to enforce the use of hooks in react components
    'react-hooks/exhaustive-deps': 'warn',

    // We do this because we're using custom hooks in an advanced way,
    // and we may intentionally choose to not include a dependency in the dependency array
    'react-hooks/exhaustive-deps': 'warn',

    // Vite does this for us as a built-in feature, there's no need for this rule extended by react-hooks/recommended
    'react/react-in-jsx-scope': 'off',

    // This should be a warning and is not an error.
    'react-refresh/only-export-components': 'warn',

    // Google ES2015 style guide wants us to use 'require-jsdoc' we're disabling it
    'require-jsdoc': 'off',

    // Google ES2015 limits the max length of lines to 80, 120 is more reasonable
    'max-len': ['error', { code: 120 }],

    //////////////////////////////////////////
    // Best practices

    // Custom plugin: https://www.npmjs.com/package/eslint-plugin-header
    // We should be enforcing a copyright header on all files
    'header/header': ['error', 'line', [
      {
        pattern: 'Copyright © \\d{4} Jalapeno Labs',
        template: `Copyright © ${new Date().getFullYear()} Jalapeno Labs`,
      }
    ]],
  },
  overrides: [
    // In test files, allow devDependencies and turn off the no-extraneous-dependencies rule
    {
      files: ['**/__test__/**/*.{js,ts}', '**/*.{test,spec}.{js,ts}'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        'i18next/no-literal-string': 'off',
        'no-console': 'off',
      }
    },
    {
      files: ['*.config.{cjs,js,ts}'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        'import/no-default-export': 'off',
        'no-undef': 'off',
        'no-console': 'off',
      }
    }
  ],
}
