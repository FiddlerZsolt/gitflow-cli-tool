import inquirer from 'inquirer';
import shell from 'shelljs';
import fs from 'fs';
import path from 'path';
import { ART } from './constants.js';
import {
  messageWithBorder,
  bold,
  green,
  red,
  yellow,
  exit,
  exitWithError,
  exitWithMessage,
  validateVersion,
} from './utils.js';

/**
 * Git Flow
 * @class
 * @classdesc A class for managing Git Flow operations
 * @property {object} config - The Git Flow configuration, optionally passed to the constructor
 * @static {object} #defaultConfig - The default Git Flow configuration
 * @example const gitFlow = new GitFlow();
 * @example gitFlow.startFeature('new-feature');
 * @example gitFlow.finishFeature('new-feature');
 * @example gitFlow.startRelease('1.0.0');
 * @example gitFlow.finishRelease('1.0.0');
 * @example gitFlow.startBugfix('fix-bug');
 * @example gitFlow.finishBugfix('fix-bug');
 * @example gitFlow.startHotfix('fix-hotfix');
 * @example gitFlow.finishHotfix('fix-hotfix');
 * @example GitFlow.init();
 */
class GitFlow {
  static #defaultConfig = {
    mainBranch: 'main',
    developBranch: 'develop',
    useStaging: false,
    pushBranches: true,
    createBranches: false,
    debug: false,
    prefixes: {
      feature: 'feature/',
      release: 'release/',
      bugfix: 'bugfix/',
      hotfix: 'hotfix/',
    },
  };
  static configFileName = '.gitflow-config.json';
  static configFilePath = path.join(process.cwd(), GitFlow.configFileName);
  config;
  commands = [];

  constructor(config) {
    if (config) {
      const mergedConfig = { ...GitFlow.#defaultConfig, ...config };
      GitFlow.validateConfig(mergedConfig);
      this.config = mergedConfig;
    } else {
      this.loadConfig();
    }
  }

  /**
   * Get the Git Flow configuration
   * @returns {object} The Git Flow configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Add a command to the queue
   * @param {string} command The command to add
   * @returns {void}
   */
  addCommand(command) {
    this.commands.push(command);
  }

  /**
   * @throws {Error} If the configuration file is missing or invalid
   * @returns {object} The Git Flow configuration
   */
  async loadConfig() {
    if (!fs.existsSync(GitFlow.configFilePath)) {
      const { runInit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'runInit',
          message: "No Git Flow configuration found. Do you want to run 'gitflow init'?",
          default: false,
        },
      ]);
      if (!runInit) {
        exitWithMessage("Run 'gitflow init' first.");
        return;
      }
      await this.init();
    }
    try {
      const config = JSON.parse(fs.readFileSync(GitFlow.configFilePath, 'utf8'));
      const mergedConfig = { ...GitFlow.#defaultConfig, ...config };
      GitFlow.validateConfig(mergedConfig);

      this.config = mergedConfig;
    } catch (error) {
      exitWithError("Invalid Git Flow configuration file. Please delete and re-run 'gitflow init'.");
    }
  }

  // 🔹 Validations
  /**
   * Validate configuration object
   * @param {object} config Configuration to validate
   * @throws {Error} If configuration is invalid
   * @returns {boolean} True if configuration is valid
   */
  static validateConfig(config) {
    // Required fields
    const requiredFields = ['mainBranch', 'developBranch', 'prefixes'];
    for (const field of requiredFields) {
      if (!config[field]) {
        exitWithError(`Missing required configuration field: ${field}`);
      }
    }

    // Branch name validations
    GitFlow.isValidBranchName(config.mainBranch);
    GitFlow.isValidBranchName(config.developBranch);
    if (config.useStaging) GitFlow.isValidBranchName(config.stagingBranch);

    // Prefix validations
    const requiredPrefixes = ['feature', 'release', 'bugfix', 'hotfix'];
    for (const prefix of requiredPrefixes) {
      if (!config.prefixes[prefix]) {
        exitWithError(`Missing required prefix: ${prefix}`);
      }
      if (!GitFlow.isValidBranchName(config.prefixes[prefix])) {
        exitWithError(`Invalid '${prefix}' prefix: ${config.prefixes[prefix]}`);
      }
    }

    // Boolean validations
    const booleanFields = ['useStaging', 'pushBranches', 'createBranches', 'debug'];
    for (const field of booleanFields) {
      if (field in config && typeof config[field] !== 'boolean') {
        exitWithError(`Invalid value for '${field}'. Must be a boolean.`);
      }
    }

    return true;
  }

  /**
   * Checks if the given version string is in the `X.Y.Z` format.
   *
   * @param {*} version
   * @returns {boolean} Whether the version is valid
   */
  isValidVersion(version) {
    if (version?.length > 1) exitWithError(`Branch name '${version.join(' ')}' cannot contain spaces.`);
    if (!validateVersion(version[0])) exitWithError(`'${version}' is not a valid version number`);
    return version[0];
  }

  /**
   * Validate branch name
   * @param {string} branchName The branch name to validate
   * @returns {boolean} Whether the branch name is valid
   */
  static isValidBranchName(branchName) {
    // Check for spaces
    const isArray = Array.isArray(branchName);
    if (isArray && branchName?.length > 1) {
      exitWithError(`Branch name '${branchName.join(' ')}' cannot contain spaces.`);
    }
    branchName = isArray ? branchName[0] : branchName;
    const invalidChars = /[^a-zA-Z0-9-_./]/;
    const isValid = !invalidChars.test(branchName);
    if (!isValid) {
      exitWithError(`Invalid branch name '${branchName}'. Use only letters, numbers, hyphens and underscores.`);
    }
    return isValid;
  }

  // 🔹 Command execution
  /**
   * Run the commands in the queue
   *
   * @throws {Error} If a command fails
   * @returns {void}
   */
  runCommands() {
    try {
      console.info(`Running commands...🚀`);
      console.info(green('Commands:'), this.commands);

      if (this.config.debug) {
        console.error('Debug mode enabled, do not run commands');
        exit();
      }

      for (const command of this.commands) {
        if (this.config.debug) console.info('command: ', command);

        const result = shell.exec(command, { silent: true });
        if (this.config.debug) console.info('result: ', result);

        if (result.code !== 0) {
          exitWithError(`${result.stderr === '' ? result.stdout : result.stderr}`);
        }
      }
      return;
    } catch (error) {
      console.error(error?.message || error);
    }
  }

  // 🔹 Branch management
  /**
   * @returns {string} The name of the current branch
   */
  getCurrentBranchName() {
    const { stdout } = shell.exec('git branch --show-current', { silent: true });
    return stdout.trim();
  }

  /**
   * Check if a branch exists locally
   *
   * @param {string} branch The name of the branch to check
   * @returns {boolean} Whether the branch exists
   */
  branchExistsLocal(branch) {
    return shell.exec(`git rev-parse --verify ${branch}`, { silent: true }).code === 0;
  }

  /**
   * Check if a branch exists on the remote repository
   * @param {string} branch The name of the branch to check
   * @returns {boolean} Whether the branch exists on the remote repository
   */
  branchExistsRemote(branch) {
    return shell.exec(`git ls-remote --heads origin ${branch}`, { silent: true }).stdout !== '';
  }

  /**
   * Check diff between two branches
   * @param {string} branch1 The first branch
   * @param {string} branch2 The second branch
   * @returns {void}
   * @throws {Error} If the diff fails
   */
  checkDiff(branch1, branch2) {
    console.info(`Check diff between ${green(branch1)} and ${green(branch2)}`);
    this.addCommand(`git diff ${branch1}..${branch2}`);
  }

  /**
   * Check if two branches have the same commit hash
   * @param {string} branch1 The first branch
   * @param {string} branch2 The second branch
   * @returns {boolean} Whether the branches have the same commit hash
   * @throws {Error} If the command fails
   */
  branchesMatch(branch1, branch2) {
    const branch1Hash = shell.exec(`git rev-parse ${branch1}`, { silent: true }).stdout.trim();
    const branch2Hash = shell.exec(`git rev-parse ${branch2}`, { silent: true }).stdout.trim();
    return branch1Hash === branch2Hash;
  }

  /**
   * Compare two branches and determine how many commits branch1 is ahead
   * or behind branch2.
   *
   * @param {string} branch1 The branch to compare.
   * @param {string} branch2 The branch to compare against.
   * @returns {object} An object with properties "ahead" and "behind".
   */
  compareBranches(branch1, branch2) {
    const { stdout, stderr } = shell.exec(`git rev-list --left-right --count ${branch1}...${branch2}`, {
      silent: true,
    });
    if (stderr) exitWithError(stderr);
    const counts = stdout.trim().split('\t');
    const ahead = parseInt(counts[0], 10);
    const behind = parseInt(counts[1], 10);
    return { ahead, behind };
  }

  /**
   * Check if there are merge conflicts in the working directory.
   *
   * @returns {boolean} True if merge conflicts exist, otherwise false.
   */
  checkMergeConflicts() {
    const { stdout, stderr } = shell.exec('git diff --name-only --diff-filter=U', { silent: true });
    if (stderr) {
      exitWithError(stderr);
    }
    const conflicts = stdout
      .trim()
      .split('\n')
      .filter((file) => file);

    if (conflicts.length > 0) {
      console.error(`${red(`Merge conflicts detected in:`)}\n${conflicts.join(',\n')}\n`);
      return true;
    }
    console.info(green('No merge conflicts detected.'));
    return false;
  }

  /**
   * Add git tag
   * @param {string} version The version number for the release
   * @returns {void}
   * @throws {Error} If the version number is invalid
   */
  addTag(version) {
    console.info(`Add tag ${yellow(version)}`);
    this.addCommand(`git tag -a v${version} -m "v${version}"`);
  }

  /**
   * Checks if the working directory is clean (no uncommitted changes).
   * @returns {boolean} True if clean; otherwise, exits with an error.
   */
  checkWorkingTreeClean() {
    const result = shell.exec('git status --porcelain', { silent: true });
    if (result.stdout.trim() !== '') {
      exitWithError('Uncommitted changes exist. Please commit or stash your changes before switching branches.');
    }
    return true;
  }

  /**
   * Checkout a branch
   *
   * @param {*} branch
   */
  checkoutBranch(branch) {
    const currentBranch = this.getCurrentBranchName();
    if (currentBranch === branch) return;
    if (!this.branchExistsLocal(branch)) {
      exitWithError(`${branch} does not exist`);
    }
    this.checkWorkingTreeClean();
    if (this.config.debug) console.info(`Checkout to ${green(branch)} branch`);
    this.addCommand(`git checkout ${branch}`);
    this.addCommand(`git pull`);
  }

  /**
   * Checkout to the main branch
   * @returns {void}
   */
  checkoutToMain() {
    if (!this.config.mainBranch) exitWithError('Main branch is not found in the configuration');
    if (this.config.mainBranch === this.getCurrentBranchName()) return;
    this.checkoutBranch(this.config.mainBranch);
  }

  /**
   * Checkout to the develop branch
   * @returns {void}
   */
  checkoutToDevelop() {
    if (!this.config.developBranch) exitWithError('Develop branch is not found in the configuration');
    const currentBranch = this.getCurrentBranchName();
    if (this.config.developBranch === currentBranch) return;
    this.checkoutBranch(this.config.developBranch);
  }

  /**
   * Checkout to the staging branch
   * @returns {void}
   */
  checkoutToStaging() {
    if (!this.config.useStaging) exitWithError('Staging branch is not enabled in the configuration');
    if (!this.config.stagingBranch) exitWithError('Staging branch is not found in the configuration');
    if (this.config.stagingBranch === this.getCurrentBranchName()) return;
    this.checkoutBranch(this.config.stagingBranch);
  }

  /**
   * Create a new branch
   * @param {string} branchName The name of the branch to create
   * @param {string} fromBranch The branch to create the new branch from
   * @returns {void}
   * @throws {Error} If the branch already exists
   */
  createBranch(branchName, fromBranch) {
    if (this.branchExistsLocal(branchName)) {
      exitWithError(`${branchName} already exists`);
    }
    console.info(` - A new branch '${green(branchName)}' was created, based on '${green(fromBranch)}'`);
    this.addCommand(`git checkout -b ${branchName} ${fromBranch}`);
  }

  /**
   * Merge a branch into another branch
   * @param {string} sourceBranch The branch to merge
   * @param {string} targetBranch The branch to merge into
   * @returns {void}
   * @throws {Error} If the merge fails
   */
  mergeBranch(sourceBranch, targetBranch) {
    console.info(`Merge ${green(sourceBranch)} into ${green(targetBranch)}`);
    this.addCommand(`git checkout ${targetBranch}`);
    this.addCommand(`git merge --no-ff ${sourceBranch}`);
    if (this.checkMergeConflicts()) {
      exitWithError('Please resolve merge conflicts and try again');
    }
    if (this.config.pushBranches) this.pushBranch();
  }

  /**
   * Delete a branch locally and remotely
   * @param {string} branchName The name of the branch to delete
   * @returns {void}
   */
  deleteBranch(branchName) {
    if (!this.branchExistsLocal(branchName)) {
      exitWithError(`${branchName} does not exist`);
    }
    console.info(`Delete local ${green(branchName)} branch`);
    this.addCommand(`git branch -d ${branchName}`);

    // Also delete remote branch if pushBranches is enabled
    if (this.config.pushBranches) {
      console.info(`Delete remote ${green(branchName)} branch`);
      this.addCommand(`git push origin --delete ${branchName}`);
    }
  }

  deleteAllLocalBranches() {
    const { stdout, stderr } = shell.exec('git branch --list', { silent: true });
    if (stderr) {
      exitWithError(stderr);
    }
    const branches = stdout
      .trim()
      .split('\n')
      .map((branch) => branch.trim().replace('*', ''))
      .filter((branch) => branch !== 'main' && branch !== 'develop');

    if (branches.length === 0) {
      console.info('No branches to delete');
      return;
    }

    console.info('Deleting local branches...');
    this.addCommand(`git branch | grep -v "main" | xargs git branch -D`);
    this.runCommands();
  }

  /**
   * Push the current branch to the remote repository
   * @returns {void}
   * @throws {Error} If the push fails
   * @returns {void}
   */
  pushBranch() {
    const currentBranch = this.getCurrentBranchName();
    console.info(`Push ${green(currentBranch)} branch to remote`);
    this.addCommand(`git push origin ${currentBranch}`);
  }

  // 🔹 Git Flow initialization
  /**
   * Gitflow init
   * @returns {void}
   * @throws {Error} If the configuration file is missing or invalid
   */
  static async init(args) {
    try {
      console.log(ART, '\n');
      console.log('🔧 Initializing Git Flow...\n');
      const useDefaultConfig = args?.yes;

      let defaultConfig = GitFlow.#defaultConfig;
      // Check if config exists and prompt for overwrite
      if (fs.existsSync(GitFlow.configFilePath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Git Flow is already initialized. Do you want to overwrite the existing configuration?',
            default: false,
          },
        ]);
        if (!overwrite) {
          exitWithMessage('🚫 Initialization cancelled.');
        }

        // Ask for use exists config or use default config
        const { useExistingConfig } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'useExistingConfig',
            message: 'Do you want to use the existing configuration or create a new one?',
            default: true,
          },
        ]);
        if (useExistingConfig) {
          // Load existing configuration
          defaultConfig = JSON.parse(fs.readFileSync(GitFlow.configFilePath, 'utf8'));
        }
      }

      console.log("Let's configure Git Flow...");
      let config = useDefaultConfig
        ? defaultConfig
        : await inquirer.prompt([
            {
              type: 'input',
              name: 'mainBranch',
              message: 'Enter the name of your main branch:',
              default: 'main',
              validate: GitFlow.isValidBranchName,
            },
            {
              type: 'input',
              name: 'developBranch',
              message: 'Enter the name of your develop branch:',
              default: 'develop',
              validate: GitFlow.isValidBranchName,
            },
            {
              type: 'confirm',
              name: 'useStaging',
              message: 'Would you like to use a staging branch for testing?',
              default: false,
            },
            {
              type: 'input',
              name: 'stagingBranch',
              message: 'Enter the name of your staging branch:',
              when: (answers) => answers.useStaging,
              default: 'staging',
              validate: GitFlow.isValidBranchName,
            },
            {
              type: 'confirm',
              name: 'pushBranches',
              message: 'Do you want to push the new branches to remote?',
              default: true,
            },
            {
              type: 'confirm',
              name: 'createBranches',
              message: 'Do you want to create the branches now?',
              default: false,
            },
          ]);

      config = { ...defaultConfig, ...config };

      const gitFlow = new GitFlow(config);

      const { mainBranch, developBranch, useStaging, stagingBranch, pushBranches, createBranches, debug } =
        gitFlow.getConfig();

      if (debug) {
        console.error('Debug mode enabled do not save configuration file');
        console.info(green('Configuration:'), gitFlow.getConfig());
      }

      // Ask for create branches on remote

      const { createBranchesOnRemote } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createBranchesOnRemote',
          message: 'Do you want to create the branches on remote?',
          default: false,
        },
      ]);

      // Checkout main branch if not on main branch before commit config file
      if (gitFlow.getCurrentBranchName() !== mainBranch) gitFlow.addCommand(`git checkout ${mainBranch}`);

      // Create branch for the config file
      if (!gitFlow.branchExistsLocal('main')) gitFlow.addCommand(`git checkout -b gitflow-config main`);

      // Save configuration to file
      console.info('Saving configuration...');
      fs.writeFileSync(GitFlow.configFilePath, JSON.stringify(gitFlow.getConfig(), null, 2));

      // Add and commit configuration file to main branch and push
      if (!gitFlow.checkWorkingTreeClean()) {
        console.info('Committing configuration file');
        gitFlow.addCommand(`git add .`);
        gitFlow.addCommand(`git commit -m "Add gitflow configuration file"`);
        gitFlow.addCommand(`git push origin ${mainBranch}`);
      }

      // Create branches if the user opts to do so
      if (createBranchesOnRemote) {
        // Create branches if they do not exist

        // Checkout main brach if not on main branch before commit config file
        if (gitFlow.getCurrentBranchName() !== mainBranch) {
          gitFlow.addCommand(`git checkout ${mainBranch}`);
        } else {
          console.info(`Main branch '${mainBranch}' already exists, and you are on it`);
        }

        // Create develop branch
        if (!gitFlow.branchExistsLocal(developBranch)) {
          if (!gitFlow.branchExistsRemote(stagingBranch))
            gitFlow.addCommand(`git checkout -b ${developBranch} ${mainBranch}`);
          gitFlow.addCommand(`git push -u origin ${developBranch}`);
        } else {
          console.info(`Develop branch '${developBranch}' already exists`);
        }

        // Create staging branch
        if (useStaging && gitFlow.branchExistsLocal(stagingBranch)) {
          if (!gitFlow.branchExistsRemote(stagingBranch))
            gitFlow.addCommand(`git checkout -b ${stagingBranch} ${developBranch}`);
          gitFlow.addCommand(`git push -u origin ${stagingBranch}`);
        } else {
          console.info(`Staging branch '${stagingBranch}' already exists`);
        }

        // Switch to main branch
        gitFlow.addCommand(`git checkout ${mainBranch}`);
      }

      gitFlow.runCommands();

      console.log('\n✅ Git Flow has been initialized with branches:');
      console.log(`  - Main: ${mainBranch}`);
      console.log(`  - Develop: ${developBranch}`);
      if (useStaging) console.log(`  - Staging: ${stagingBranch}`);
      if (createBranches) console.log('All branch is ready!');
      console.log(`\nConfiguration file: ${GitFlow.configFilePath}`);
    } catch (error) {
      console.error(error?.message || error);
    }
  }

  // 🔹 Feature branch management
  /**
   * Start a new feature branch
   * @param {string} name The name of the feature branch
   * @returns {void}
   * @throws {Error} If the feature branch already exists
   */
  startFeature(name) {
    name = GitFlow.isValidBranchName(name);
    const featureBranchName = `${this.config.prefixes.feature}${name}`;
    if (this.branchExistsLocal(featureBranchName)) {
      exitWithError(`${featureBranchName} already exists`);
    }
    messageWithBorder(`🚀 Start new feature`);
    console.info('Summary of actions:');

    this.checkoutToDevelop();
    this.createBranch(featureBranchName, this.config.developBranch);
    this.runCommands();

    console.info(` - You are now on branch '${green(featureBranchName)}'`);
    console.info(`\nNow, start committing on your feature. When done, use:`);
    console.info(`   gitflow feature:finish ${featureBranchName}"`);

    console.info(`\n💚 ${bold('Done')}\n`);
  }

  /**
   * Finish a feature branch
   *
   * @param {string} name The name of the feature branch
   * @returns {void}
   * @throws {Error} If the feature branch does not exist
   */
  finishFeature(name) {
    name = GitFlow.isValidBranchName(name);
    const featureBranchName = `${this.config.prefixes.feature}${name}`;
    if (!this.branchExistsLocal(featureBranchName)) {
      exitWithError(`${featureBranchName} does not exist`);
    }
    if (this.branchesMatch(featureBranchName, this.config.developBranch)) {
      exitWithError(`No commits yet on ${featureBranchName}`);
    }

    messageWithBorder(`🚀 Finishing ${featureBranchName}`);
    this.checkoutToDevelop();
    this.mergeBranch(featureBranchName, this.config.developBranch);
    if (this.config.useStaging) {
      this.checkoutToStaging();
      this.mergeBranch(featureBranchName, this.config.stagingBranch);
    }
    this.deleteBranch(featureBranchName);

    this.runCommands();

    if (!this.config.pushBranches) {
      console.info(red('Branches are not pushed to remote. Run `git push origin <branch>` to push'));
      return;
    }
  }

  // 🔹 Release branch management
  /**
   * Start a new release branch
   *
   * @param {string} version The version number for the release
   * @returns {void}
   * @throws {Error} If the version number is invalid
   */
  startRelease(version) {
    version = this.isValidVersion(version);
    const releaseBranchName = `${this.config.prefixes.release}${version}`;
    if (this.branchExistsLocal(releaseBranchName)) {
      exitWithError(`${releaseBranchName} already exists`);
    }
    messageWithBorder(`🚀 Start new release`);
    this.checkoutToDevelop();
    this.createBranch(releaseBranchName, this.config.developBranch);
    this.runCommands();
  }

  /**
   * Finish a release branch
   * @param {string} version The version number for the release
   * @returns {void}
   * @throws {Error} If the version number is invalid
   */
  finishRelease(version) {
    version = this.isValidVersion(version);
    const releaseBranchName = `${this.config.prefixes.release}${version}`;
    if (!this.branchExistsLocal(releaseBranchName)) {
      exitWithError(`${releaseBranchName} does not exist`);
    }

    messageWithBorder(`🚀 Finishing ${releaseBranchName}`);
    this.checkoutToMain();
    this.mergeBranch(releaseBranchName, this.config.mainBranch);
    this.addTag(version);

    this.checkoutToDevelop();
    this.mergeBranch(releaseBranchName, this.config.developBranch);

    if (this.config.useStaging) {
      this.checkoutToStaging();
      this.mergeBranch(releaseBranchName, this.config.stagingBranch);
    }

    this.deleteBranch(releaseBranchName);
    this.runCommands();

    if (!this.config.pushBranches) {
      console.info(red('Branches are not pushed to remote. Run `git push origin <branch>` to push'));
      return;
    }

    messageWithBorder('🎉 Congratulation for the new release 🥳');
  }

  // 🔹 Bugfix branch management
  /**
   * Start a new bugfix branch
   * @param {string} name The name of the bugfix branch
   * @returns {void}
   * @throws {Error} If the bugfix branch already exists
   */
  startBugfix(name) {
    name = GitFlow.isValidBranchName(name);
    const bugfixBranchName = `${this.config.prefixes.bugfix}${name}`;
    if (this.branchExistsLocal(bugfixBranchName)) {
      exitWithError(`${bugfixBranchName} already exists`);
    }
    messageWithBorder(`🚀 Start new bugfix`);
    this.checkoutToDevelop();
    this.createBranch(bugfixBranchName, this.config.developBranch);
    this.runCommands();
  }

  /**
   * Finish a bugfix branch
   * @param {string} name The name of the bugfix branch
   * @returns {void}
   * @throws {Error} If the bugfix branch does not exist
   */
  finishBugfix(name) {
    name = GitFlow.isValidBranchName(name);
    const bugfixBranchName = `${this.config.prefixes.bugfix}${name}`;
    if (!this.branchExistsLocal(bugfixBranchName)) {
      exitWithError(`${bugfixBranchName} does not exist`);
    }
    if (this.branchesMatch(bugfixBranchName, this.config.developBranch)) {
      exitWithError(`No commits yet on ${bugfixBranchName}`);
    }

    messageWithBorder(`🚀 Finishing ${bugfixBranchName}`);
    this.checkoutToDevelop();
    this.mergeBranch(bugfixBranchName, this.config.developBranch);
    if (this.config.useStaging) {
      this.checkoutToStaging();
      this.mergeBranch(bugfixBranchName, this.config.stagingBranch);
    }
    this.deleteBranch(bugfixBranchName);

    this.runCommands();

    if (!this.config.pushBranches) {
      console.info(red('Branches are not pushed to remote. Run `git push origin <branch>` to push'));
      return;
    }
  }

  // 🔹 Hotfix branch management
  /**
   * Start a new hotfix branch
   * @param {string} name The name of the hotfix branch
   * @returns {void}
   * @throws {Error} If the hotfix branch already exists
   */
  startHotfix(name) {
    name = GitFlow.isValidBranchName(name);
    const hotfixBranchName = `${this.config.prefixes.hotfix}${name}`;
    if (this.branchExistsLocal(hotfixBranchName)) {
      exitWithError(`${hotfixBranchName} already exists`);
    }
    messageWithBorder(`🚀 Start new hotfix`);
    this.checkoutToMain();
    this.createBranch(hotfixBranchName, this.config.mainBranch);
    this.runCommands();
  }

  /**
   * Finish a hotfix branch
   * @param {string} name The name of the hotfix branch
   * @returns {void}
   * @throws {Error} If the hotfix branch does not exist
   */
  finishHotfix(name) {
    name = GitFlow.isValidBranchName(name);
    const hotfixBranchName = `${this.config.prefixes.hotfix}${name}`;
    if (!this.branchExistsLocal(hotfixBranchName)) {
      exitWithError(`${hotfixBranchName} does not exist`);
    }
    if (this.branchesMatch(hotfixBranchName, this.config.mainBranch)) {
      exitWithError(`No commits yet on ${hotfixBranchName}`);
    }

    messageWithBorder(`🚀 Finishing ${hotfixBranchName}`);
    this.checkoutToMain();
    this.mergeBranch(hotfixBranchName, this.config.mainBranch);
    this.checkoutToDevelop();
    this.mergeBranch(hotfixBranchName, this.config.developBranch);
    if (this.config.useStaging) {
      this.checkoutToStaging();
      this.mergeBranch(hotfixBranchName, this.config.stagingBranch);
    }
    this.deleteBranch(hotfixBranchName);

    this.runCommands();

    if (!this.config.pushBranches) {
      console.info(red('Branches are not pushed to remote. Run `git push origin <branch>` to push'));
      return;
    }
  }
}

export default GitFlow;
