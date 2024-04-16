import { exec } from 'child_process';
import open from 'open';

function runCommand(
  command: string,
  repoPath: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: repoPath }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout: stdout.replace(/\s$/g, ''), stderr });
    });
  });
}

async function getBranchHash(repo: string, branch: string, remote = false) {
  const refPath = remote
    ? `refs/remotes/origin/${branch}`
    : `refs/heads/${branch}`;
  const { stdout: hash } = await runCommand(`git rev-parse ${refPath}`, repo);

  return hash;
}

async function getHashBCommitsNotInHashACount(
  repo: string,
  hashA: string,
  hashB: string
) {
  const { stdout: commitsCount } = await runCommand(
    `git rev-list ${hashA}..${hashB} --count`,
    repo
  );

  return parseInt(commitsCount);
}

export async function branchCompare(
  repo: string,
  branch: string,
  remoteBranch: string
): Promise<void> {
  try {
    process.chdir(repo);
    // Check if the local branch exists
    try {
      await runCommand(
        `git show-ref --verify --quiet refs/heads/${branch}`,
        repo
      );
    } catch (error) {
      console.log(`Local branch ${branch} doesn't exist in ${repo}. Skipping.`);
      return;
    }

    // Fetch remote changes silently
    await runCommand('git fetch >/dev/null 2>&1', repo);

    // Get the commit hash of the local and remote branches
    const [localHash, remoteHash] = await Promise.all([
      getBranchHash(repo, branch),
      getBranchHash(repo, remoteBranch, true),
    ]);

    console.log(`============= ${repo} ==============`);
    if (localHash !== remoteHash) {
      // Check if the local branch contains commits not in the remote branch
      //   const { stdout: localCommitsCount } = await runCommand(
      //     `git rev-list ${remoteHash}..${localHash} --count`,
      //     repo
      //   );
      const localCommitsCount = await getHashBCommitsNotInHashACount(
        repo,
        remoteHash,
        localHash
      );
      if (localCommitsCount > 0) {
        console.log(
          `Local branch ${branch} contains ${localCommitsCount} commits not in the remote branch ${remoteBranch}.`
        );
      }

      // Check if the remote branch contains commits not in the local branch
      //   const { stdout: remoteCommitsCount } = await runCommand(
      //     `git rev-list ${localHash}..${remoteHash} --count`,
      //     repo
      //   );
      const remoteCommitsCount = await getHashBCommitsNotInHashACount(
        repo,
        localHash,
        remoteHash
      );
      if (remoteCommitsCount > 0) {
        console.log(
          `Remote branch ${remoteBranch} contains ${remoteCommitsCount} commits not in the local branch ${branch}.`
        );
      }

      if (localCommitsCount === 0 && remoteCommitsCount === 0) {
        console.log(`${branch} and ${remoteBranch} branches have diverged.`);
      }
    }

    // Echo the latest commit message of the local branch
    const { stdout: latestCommitMsg } = await runCommand(
      `git log -1 --pretty=%B refs/heads/${branch}`,
      repo
    );
    console.log(
      `Latest commit message of local branch ${branch}: ${latestCommitMsg}`
    );
    console.log('====================================');
  } catch (error) {
    console.error(`Failed to execute compare for the repository: ${repo}`);
    console.error(error);
  }
}

async function removeBranch(
  repo: string,
  branch: string,
  includeRemote = false
) {
  try {
    await runCommand(`git branch -D ${branch}`, repo);
    if (includeRemote) {
      await runCommand(`git push origin --delete ${branch}`, repo);
    }
  } catch (error) {
    console.error(`Failed to remove branch ${branch} from ${repo}`);
    console.error(error);
  }
}

export async function branchMerge({
  repo,
  sourceBranch,
  targetBranch,
  newBranchName,
  message,
  prepare,
}: {
  repo: string;
  sourceBranch: string;
  targetBranch: string;
  newBranchName: string;
  message: string;
  prepare?: string;
}): Promise<void> {
  try {
    try {
      await runCommand(`git checkout -t origin/${sourceBranch}`, repo);
    } catch (error) {
      await runCommand(`git checkout ${sourceBranch}`, repo);
    }
    await runCommand('git pull', repo);
    // Check if target branch diff with source branch
    const [sourceHash, targetHash] = await Promise.all([
      getBranchHash(repo, sourceBranch),
      getBranchHash(repo, targetBranch, true),
    ]);
    const commitsCount = await getHashBCommitsNotInHashACount(
      repo,
      sourceHash,
      targetHash
    );

    if (commitsCount === 0) {
      console.log(`${sourceBranch} Already up to date.`);
      return;
    }

    await removeBranch(repo, newBranchName, true);

    // Create a new branch
    try {
      await runCommand(`git checkout -b ${newBranchName}`, repo);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      if (error.message.includes('already exists')) {
        await runCommand(`git checkout ${newBranchName}`, repo);
      } else {
        throw error;
      }
    }

    // Merge changes from the source branch into the new branch
    const { stdout: mergeOutput } = await runCommand(
      `git merge origin/${targetBranch} --no-ff -m "${message}"`,
      repo
    );

    if (mergeOutput.includes('up to date')) {
      console.log(`${sourceBranch} Already up to date.`);
      return;
    }
    let urlStr = '';
    try {
      // Push the new branch to the remote repository
      const { stderr } = await runCommand(
        `git push --set-upstream origin ${newBranchName}`,
        repo
      );
      urlStr = stderr;
    } catch (error) {
      if (prepare) {
        await runCommand(prepare, repo);

        // Push the new branch to the remote repository
        const { stderr } = await runCommand(
          `git push --set-upstream origin ${newBranchName}`,
          repo
        );
        urlStr = stderr;
      } else {
        throw error;
      }
    }
    const [url] = urlStr.match(/(https?:\/\/[^\s]+)/g) || [];

    if (url) {
      await open(url);
    }

    console.log(
      `Merge request created: ${newBranchName} has been pushed to the remote repository.`
    );
  } catch (error) {
    console.error('Failed to create merge request:', error);
    throw error;
  }
}
