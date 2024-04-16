# git-rescuer

When you need to do the code merges for multiple repositories, this is a tool for you. It can help you to compare the changes between branches and create the merge requests for you. What you need to do is specifying the `config.json` file for it.

## Usage
```bash
git-rescuer -c /projects/config.json

# to skip compare
git-rescuer -c /projects/config.json --skip-compare

# to skip merge
git-rescuer -c /projects/config.json --skip-merge
```

Let us assume you have a project structure like this:
```
/
├── projects
│   ├── repo1
│   ├── repo2
│   ├── repo3
│   ├── ...
```
If you want to diff the local branch `develop` of `repo1` with its tracking remote branch, you could specify the config json file as following:
```json
{
    "rootPath": "/projects",
    "compare": [
        {
            "name": "repo1",
            "local_branch": "develop"
        }
    ]
}
```
If you want to diff the local branch `develop`  of `repo1` with other remote branch `master`, you could specify the config json file as following:
```
{
    "rootPath": "/projects",
    "compare": [
        {
            "name": "repo1",
            "local_branch": "feature",
            "remote_branch: "master"
        }
    ]
}
```
If you want to create a merge request to merge the `master` changes into `develop` with a middle branch `branch-for-merge`, you could specify the config json file as following:
```
{
    "rootPath": "/projects",
    "merge": [
        {
            "name": "repo3",
            "local_branch: "develop",
            "remote_branch": "master",
            "new_branch_name": "branch-for-merge",
            "prepare": "npm install",
            "message": "[jira ticket]: Merge branch 'master' into 'develop'"
        }
    ]
}
```
If you want to do all of these at the same time, you could put those into a single config file:

```
{
    "rootPath": "/projects",
    "compare": [
        {
            "name": "repo1",
            "local_branch": "feature",
            "remote_branch: "master"
        }
        {
            "name": "repo1",
            "local_branch": "develop"
        },
        {
            "name": "repo2",
            "local_branch": "feature",
            "remote_branch": "develop"
        }
    ],
    "merge": [
        {
            "name": "repo3",
            "local_branch: "develop",
            "remote_branch": "master",
            "new_branch_name": "branch-for-merge",
            "prepare": "npm install",
            "message": "[jira ticket]: Merge branch 'master' into 'develop'"
        }
    ]
}
```
