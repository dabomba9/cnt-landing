/* eslint-disable */
export default {
  displayName: 'hosting-new-listing',
  preset: '../../../jest.preset.js',
  setupFilesAfterEach: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/feature/hosting-new-listing',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
