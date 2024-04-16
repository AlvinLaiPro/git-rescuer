import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { Config } from './types';
import { branchCompare, branchMerge } from './helper';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const program: Command = new Command();
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
) as { version: string };

program
  .name('git-rescuer')
  .version(packageJson.version)
  .option('-d, --debug', 'enables verbose logging', false)
  .requiredOption('-c, --config <path>', 'path to the config file')
  .option('--skip-merge', 'skip merge operation', false)
  .option('--skip-compare', 'skip compare operation', false)
  .parse(process.argv);

const {
  config,
  skipMerge,
  skipCompare,
}: {
  config: string;
  skipMerge: boolean;
  skipCompare: boolean;
} = program.opts();

function getConfig() {
  const configPath = path.isAbsolute(config)
    ? config
    : path.join(process.cwd(), config);

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    throw new Error('Config file not found');
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Config;
}

function runCli() {
  const { compare, merge, rootPath } = getConfig();
  !skipCompare &&
    compare?.forEach(
      ({ name: repoName, local_branch, remote_branch, repository_path }) => {
        const repoPath = repository_path
          ? repository_path
          : path.join(rootPath, repoName);
        process.chdir(repoPath);
        void branchCompare(
          repoPath,
          local_branch,
          remote_branch ?? local_branch
        );
      }
    );

  !skipMerge &&
    merge?.forEach(
      ({
        name: repoName,
        local_branch,
        remote_branch,
        new_branch_name,
        repository_path,
        message,
        prepare,
      }) => {
        const repoPath = repository_path
          ? repository_path
          : path.join(rootPath, repoName);
        process.chdir(repoPath);
        void branchMerge({
          repo: repoPath,
          sourceBranch: local_branch,
          targetBranch: remote_branch,
          newBranchName: new_branch_name,
          message,
          prepare,
        });
      }
    );
}

runCli();
