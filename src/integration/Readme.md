# What is this?
This folder contains potentially slow-running integration tests that require working with the obsidian API directly.

## Contracts Folder
The contracts folder provides contracts to interfaces that unit tests, and integration tests, can run against.

## Framework Folder
The framework folder is an ad-hoc testing framework that can run within obsidian.

# Why is it inside the src folder?
To make the rollup-typscript plugin not complain about typescript files being outside of the rootDir.

# Will it be included in the plugin?
No.  There is a new build configuration that targets the main.ts file located here.  It is a complete isolated build.  When the normal build process is run, the normal main.ts file with the src folder is targeted, and nothing in this folder is imported, thus, nothing in this folder is bundled.

## How do I run the tests?
run `npm run test:integration`
Then open the test vault in obsidian.

## How do I add new tests?
The ad-hoc framework does not automatically detect tests within the tests folder, so, for now, a reference to your new test will need to be added to the list in the run.ts file.