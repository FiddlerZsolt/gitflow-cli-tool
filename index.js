#!/usr/bin/env node

import { program } from 'commander';
import GitFlow from './src/GitFlow.js';

// 🔹 Git Flow initialization (interactive mode)
program
  .command('init')
  .description('Initialize Git Flow with custom branch names')
  .option('-y --yes', 'No questions', false)
  .action(async (args) => GitFlow.init(args));

// 🔹 Feature branch management
program
  .command('feature:start <name...>')
  .description('Start a new feature branch')
  .action((name) => new GitFlow().startFeature(name));

program
  .command('feature:finish <name...>')
  .description('Finish a feature branch and merge to staging or develop')
  .action((name) => new GitFlow().finishFeature(name));

// 🔹 Release branch management
program
  .command('release:start <version...>')
  .description('Start a new release branch')
  .action((version) => new GitFlow().startRelease(version));

program
  .command('release:finish <version...>')
  .description('Finish a release branch and merge to main and develop')
  .action((version) => new GitFlow().finishRelease(version));

// 🔹 Bugfix branch management
program
  .command('bugfix:start <name...>')
  .description('Start a new bugfix branch')
  .action((name) => new GitFlow().startBugfix(name));

program
  .command('bugfix:finish <name...>')
  .description('Finish a bugfix branch and merge to staging or develop')
  .action((name) => new GitFlow().finishBugfix(name));

// 🔹 Hotfix branch management
program
  .command('hotfix:start <name...>')
  .description('Start a new hotfix branch')
  .action((name) => new GitFlow().startHotfix(name));

program
  .command('hotfix:finish <name...>')
  .description('Finish a hotfix branch and merge to staging, develop, and main')
  .action((name) => new GitFlow().finishHotfix(name));

// 🔹 Switch branch
program
  .command('switch <branch>')
  .description('Switch to a branch')
  .action((branch) => new GitFlow().checkoutBranch(branch));

// 🔹 Multiple argument test
program
  .command('test <version...>')
  .description('Test multiple arguments')
  .action((version) => console.log({ version }));

// Test command
program
  .command('test:command <name>')
  .description('Test command')
  .action((name) => {
    try {
      console.log('Test command');
      console.log(name);
      const gitFlow = new GitFlow();
      console.info('Branch exists on remote: ', gitFlow.branchExistsRemote(name));
      console.info(`Done`);
    } catch (error) {
      console.error(error);
    }
  });

program.parse(process.argv);
