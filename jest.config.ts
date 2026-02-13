import type {Config} from 'jest';

const config: Config = {
  bail: true,
  clearMocks: true,
  coverageProvider: "v8",
  preset: "ts-jest",
  testEnvironment: "jest-environment-node",
  testMatch: ["<rootDir>/src/**/*.(spec|test).ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}

export default config
