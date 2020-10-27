#!/usr/bin/env node
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const getRepoInfo = require('git-repo-info');
const packageList = require('./package-list');

const [, , ...args] = process.argv;
const repoInfo = getRepoInfo();
// TODO: Get repo info
// console.log('repoInfo: ', repoInfo);

let projectName = null;
const getSourceFile = (file) => path.join(__dirname, 'sources', file);
const getJsonFile = (file) => JSON.parse(fs.readFileSync(file));
const getDataFile = (file) => fs.readFileSync(file);
const writeJsonFile = (fileName, data) =>
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2), 'utf8');
const writeDataFile = (fileName, data) =>
  fs.writeFileSync(fileName, data, 'utf8');

const getParams = () =>
  args.reduce((acc, curr) => {
    if (curr.indexOf('-') !== 0 || curr.indexOf('=') <= 0) {
      return acc;
    }
    const [key, value] = curr.split('=');
    acc[key.substring(1)] = value;
    return acc;
  }, {});

console.log('====================================================');
console.log('      Welcome to samuraijs Project Generator');
console.log('====================================================');
console.log();
const cliParams = getParams();

// Get project name from cli
// TODO: Find a way to make this happen in the current directory
if (cliParams.name !== undefined) {
  projectName = cliParams.name;
}
const rootDir = path.join(__dirname, '..');
const scaffolding = [
  `./${projectName}/`,
  `./${projectName}/.prettierrc`,
  `./${projectName}/.babelrc`,
  `./${projectName}/webpack.config.js`,
  `./${projectName}/public/`,
  `./${projectName}/public/index.html`,
  `./${projectName}/src/`,
  `./${projectName}/src/index.js`,
  `./${projectName}/src/components/app/`,
  `./${projectName}/src/components/app/app.component.js`,
  `./${projectName}/src/components/app/app.scss`,
];

console.log('Cli in rootDir: ', rootDir);

for (let i = 0, len = scaffolding.length; i < len; i++) {
  const curr = scaffolding[i];
  const pieces = curr.split('/');
  const lastPiece = pieces[pieces.length - 1];
  let data = null;
  if (lastPiece === '') {
    fs.mkdirSync(curr, { recursive: true });
    continue;
  } else if (
    lastPiece.indexOf('.') === 0 ||
    lastPiece.match(/\.json$/) !== null
  ) {
    data = getJsonFile(getSourceFile(lastPiece));
    writeJsonFile(curr, data);
  } else {
    data = getDataFile(getSourceFile(lastPiece));
    writeDataFile(curr, data);
  }
}

/**
 * Setup package.json
 * Name, Description
 * TODO: Setup a way to add description
 * TODO: Setup way to include repo
 */
const packageJson = getJsonFile(
  path.join(__dirname, 'sources', 'package.json')
);
packageJson.name = projectName;
packageJson.dependencies = packageList.dependencies;
packageJson.devDependencies = packageList.devDependencies;
writeJsonFile(`./${projectName}/package.json`, packageJson);

console.log('Files have been copied!');
console.log('Running NPM Install');
cp.execSync('npm install', {
  cwd: `./${projectName}`,
});
