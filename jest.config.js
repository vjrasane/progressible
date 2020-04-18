module.exports = {
  roots: ["<rootDir>/test"],
  coverageDirectory: "coverage",
  testMatch: [
    "**/__tests__/**/*.+(ts|js)",
    "**/?(*.)+(spec|test).+(ts|js)"
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)?$": "ts-jest"
  },
  globals: {
    "ts-jest": {
      tsConfig: {
        allowJs: true,
        esModuleInterop: true
      }
    }
  }
};
