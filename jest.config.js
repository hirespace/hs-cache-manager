/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  preset: 'ts-jest',
  testEnvironment: 'node',
};
