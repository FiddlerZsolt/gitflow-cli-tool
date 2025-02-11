import chalk from 'chalk';

export function messageWithBorder(message) {
  const line = '─'.repeat(message.length);
  let top = `┌──${line}──┐`;
  let top2 = `│  ${' '.repeat(message.length)}  │`;
  let content = `│  ${message}  │`;
  let bottom2 = `│  ${' '.repeat(message.length)}  │`;
  let bottom = `└──${line}──┘`;
  console.info(`${top}\n${top2}\n${content}\n${bottom2}\n${bottom}`);
}

export function bold(text) {
  return chalk.bold(text);
}
export function green(text) {
  return chalk.black.bgGreen.underline.italic(text);
}
export function red(text) {
  return chalk.black.bgRed(text);
}
export function yellow(text) {
  return chalk.yellow(text);
}

/**
 * Exit the process with status code 1
 *
 * @returns {void}
 */
export function exit() {
  process.exit(1);
}

/**
 * Exit the process with a message
 *
 * @param {string} message
 * @returns {void}
 * @example exitWithMessage('An error occurred');
 */
export function exitWithMessage(message) {
  console.error(message);
  exit();
}

/**
 * Exit the process with an error message
 *
 * @param {string} message
 * @returns {void}
 * @example exitWithError('An error occurred');
 */
export function exitWithError(message) {
  exitWithMessage(`\n🤕 ${message}`);
}

/**
 * Validate a version string
 */
export function validateVersion(version) {
  const versionRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
  return versionRegex.test(version);
}
