#!/usr/bin/env node
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const getRepoInfo = require('git-repo-info');
const packageList = require('./package-list');

const [, , ...args] = process.argv;
const repoInfo = getRepoInfo();

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

// Get project name from cli
// TODO: Find a way to make this happen in the current directory
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
const cloneRepo = (projectName, repository, branch) => {
  console.log('[Executing] git init');
  cp.execSync('git init', {
    cwd: `./${projectName}`,
  });
  console.log('[Executing]', `git remote add -t \\* -f origin ${repository}`);
  cp.execSync(`git remote add -t \\* -f origin ${repository}`, {
    cwd: `./${projectName}`,
  });
  console.log(
    '[Executing]',
    `git checkout ${branch === 'main' ? '' : '-b'} ${branch}`
  );
  cp.execSync(`git checkout ${branch === 'main' ? '' : '-b'} ${branch}`, {
    cwd: `./${projectName}`,
  });
};
const completeScript = (projectName) => {
  console.log('Files have been copied!');
  console.log('Running NPM Install');
  cp.execSync('npm install', {
    cwd: `./${projectName}`,
  });
  closeCli();
};

const cliParams = getParams();
let config = null;
if (cliParams.config !== undefined) {
  config = getJsonFile(cliParams.config);
}

console.log('====================================================');
console.log('      Welcome to samuraijs Project Generator');
console.log('====================================================');
console.log();

const rootDir = path.join(__dirname, '..');
const buildScaffold = (projectName) => {
  console.log('Scaffolding project');
  const scaffolding = [
    `./${projectName}/`,
    `./${projectName}/.gitignore`,
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
    const lastPiece = pieces[pieces.length - 1].trim();
    let data = null;
    if (lastPiece === '') {
      fs.mkdirSync(curr, { recursive: true });
      continue;
    } else if (
      lastPiece !== '.gitignore' &&
      (lastPiece.indexOf('.') === 0 || lastPiece.match(/\.json$/) !== null)
    ) {
      data = getJsonFile(getSourceFile(lastPiece));
      writeJsonFile(curr, data);
    } else {
      data = getDataFile(getSourceFile(lastPiece));
      writeDataFile(curr, data);
    }
  }
};

let addRepo = false;
const packageJsonData = {
  dependencies: packageList.dependencies,
  devDependencies: packageList.devDependencies,
};
if (config) {
  const configPackageJsonData = {
    ...packageJsonData,
    description: config.description,
    name: config.name,
    keywords: config.keywords,
  };
  if (config.repository !== undefined) {
    configPackageJsonData.repository = config.repository;
  }
  buildScaffold(configPackageJsonData.name);
  createPackageJson(configPackageJsonData);
  if (configPackageJsonData.repository !== undefined) {
    cloneRepo(
      configPackageJsonData.name,
      configPackageJsonData.repository,
      config.branch
    );
  }
  completeScript(configPackageJsonData.name);
} else {
  getPrompt('App name: ')
    .then((response) => {
      packageJsonData.name = response;
      return getPrompt('App description: ');
    })
    .then((response) => {
      packageJsonData.description = response;
      return getPrompt('Keywords: ');
    })
    .then((response) => {
      packageJsonData.keywords = response.split(',');
      return getPrompt('Add repository? (y/N) ');
    })
    .then((response) => {
      if (response !== '' && yesResponses.includes(response)) {
        console.log('Adding repository');
        addRepo = true;
        return getPrompt('Repository: ');
      } else {
        console.log('defaulting to no');
      }
      buildScaffold(packageJsonData.name);
      createPackageJson(packageJsonData);
      completeScript(packageJsonData.name);
    })
    .then((response) => {
      packageJsonData.repository = response;
      return getPrompt('Branch name: (main) ');
    })
    .then((response) => {
      let branch = 'main';
      if (response !== '') {
        branch = response;
      }
      buildScaffold(packageJsonData.name);
      createPackageJson(packageJsonData);
      cloneRepo(packageJsonData.name, packageJsonData.repository, branch);
      completeScript(packageJsonData.name);
    });
}
