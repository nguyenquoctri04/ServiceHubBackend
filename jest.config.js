/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@app/common$': '<rootDir>/libs/common/src',
    '^@app/common/(.*)$': '<rootDir>/libs/common/src/$1',
  },
  testEnvironment: 'node',
};
