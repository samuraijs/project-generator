#!/usr/bin/env node
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const getRepoInfo = require('git-repo-info');
const packageList = require('./package-list');

const [, , ...args] = process.argv;
const repoInfo = getRepoInfo();
// TODO: Get repo info
// console.log('repoInfo: ', repoInfo);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const getParams = () =>
  args.reduce((acc, curr) => {
    if (curr.indexOf('-') !== 0 || curr.indexOf('=') <= 0) {
      return acc;
    }
    const [key, value] = curr.split('=');
    acc[key.substring(1)] = value;
    return acc;
  }, {});
let projectName = null;
const cliParams = getParams();

// Get project name from cli
// TODO: Find a way to make this happen in the current directory
if (cliParams.name !== undefined) {
  projectName = cliParams.name;
}
const yesResponses = ['y', 'Y', 'yes'];
const getSourceFile = (file) => path.join(__dirname, 'sources', file);
const getJsonFile = (file) => JSON.parse(fs.readFileSync(file));
const getDataFile = (file) => fs.readFileSync(file);
const writeJsonFile = (fileName, data) =>
  fs.writeFileSync(fileName, JSON.stringify(data, null, 2), 'utf8');
const writeDataFile = (fileName, data) =>
  fs.writeFileSync(fileName, data, 'utf8');

const createPackageJson = ({
  name,
  dependencies,
  devDependencies,
  description,
  repository,
}) => {
  const packageJson = getJsonFile(
    path.join(__dirname, 'sources', 'package.json')
  );
  packageJson.name = name;
  packageJson.dependencies = dependencies;
  packageJson.devDependencies = devDependencies;
  packageJson.description = description;
  if (repository !== undefined) {
    packageJson.repository = {
      type: 'git',
      url: `git+${repository}`,
    };
  }
  writeJsonFile(`./${name}/package.json`, packageJson);
};

const getPrompt = (prompt) =>
  new Promise((res, rej) => {
    rl.question(prompt, (promptResponse) => {
      res(promptResponse);
    });
  });
const closeCli = () => {
  process.exit(1);
};
const cloneRepo = (repository) => {
  const clonable = repository; //repository.replace('https://', 'git@');
  cp.execSync('git init', {
    cwd: `./${projectName}`,
  });
  cp.execSync(`git remote add -t \\* -f origin ${clonable}`, {
    cwd: `./${projectName}`,
  });
  cp.execSync(`git checkout main`, {
    cwd: `./${projectName}`,
  });
};
const completeScript = () => {
  console.log('Files have been copied!');
  console.log('Running NPM Install');
  cp.execSync('npm install', {
    cwd: `./${projectName}`,
  });
  closeCli();
};

console.log('====================================================');
console.log('      Welcome to samuraijs Project Generator');
console.log('====================================================');
console.log();

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
let addRepo = false;
const packageJsonData = {
  dependencies: packageList.dependencies,
  devDependencies: packageList.devDependencies,
  name: projectName,
};
getPrompt('App description: ')
  .then((response) => {
    packageJsonData.description = response;
    return getPrompt('Add repository? (y/N)');
  })
  .then((response) => {
    if (response !== '' && yesResponses.includes(response)) {
      console.log('Adding repository');
      addRepo = true;
      return getPrompt('Repository: ');
    } else {
      console.log('defaulting to no');
    }
    createPackageJson(packageJsonData);
    completeScript();
  })
  .then((response) => {
    packageJsonData.repository = response;
    createPackageJson(packageJsonData);
    cloneRepo(response);
    completeScript();
  });
